-- =============================================================
-- HireFlow — Migrasi 0003: RPC, audit otomatis, dan Storage
-- =============================================================

-- -------------------------------------------------------------
-- 1. RPC: buat organisasi + membership owner dalam satu transaksi
-- -------------------------------------------------------------
-- Insert langsung ke organizations sengaja tidak diizinkan RLS, karena
-- user belum jadi anggota apa pun saat organisasi pertama dibuat
-- (masalah ayam-dan-telur). RPC ini menutup celah itu dengan aman.

create or replace function create_organization(p_name text, p_slug text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org  organizations;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Harus login' using errcode = '42501';
  end if;

  p_slug := lower(btrim(p_slug));
  p_name := btrim(p_name);

  if length(p_name) < 2 then
    raise exception 'Nama organisasi minimal 2 karakter' using errcode = '22023';
  end if;
  if p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$' then
    raise exception 'Slug hanya boleh huruf kecil, angka, dan tanda hubung (3-50 karakter)'
      using errcode = '22023';
  end if;
  -- Slug ini bentrok dengan route aplikasi, jadi tidak boleh dipakai organisasi
  if p_slug in ('api','app','www','admin','login','register','status',
                'karier','onboarding','auth','schedule','offer',
                'dashboard','settings','jobs','candidates','_next','static') then
    raise exception 'Slug "%" sudah dipakai sistem', p_slug using errcode = '22023';
  end if;
  if exists (select 1 from organizations where slug = p_slug) then
    raise exception 'Slug "%" sudah dipakai organisasi lain', p_slug using errcode = '23505';
  end if;

  insert into organizations (slug, name, created_by)
    values (p_slug, p_name, v_user)
    returning * into v_org;

  insert into org_members (org_id, user_id, role, status)
    values (v_org.id, v_user, 'owner', 'active');

  insert into departments (org_id, name)
    values (v_org.id, 'Umum');

  insert into locations (org_id, name, is_remote)
    values (v_org.id, 'Jakarta', false), (v_org.id, 'Remote', true);

  insert into activities (org_id, actor_id, entity_type, entity_id, action)
    values (v_org.id, v_user, 'organization', v_org.id, 'created');

  return v_org;
end $$;

revoke all on function create_organization(text, text) from public;
grant execute on function create_organization(text, text) to authenticated;

-- -------------------------------------------------------------
-- 2. Audit otomatis untuk job
-- -------------------------------------------------------------

create or replace function log_job_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into activities (org_id, actor_id, entity_type, entity_id, action, metadata)
      values (new.org_id, auth.uid(), 'job', new.id, 'created',
              jsonb_build_object('title', new.title));
  elsif new.status is distinct from old.status then
    insert into activities (org_id, actor_id, entity_type, entity_id, action, metadata)
      values (new.org_id, auth.uid(), 'job', new.id, 'status_changed',
              jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'published' and old.status <> 'published' and new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  return new;
end $$;

drop trigger if exists jobs_activity_ins on jobs;
create trigger jobs_activity_ins after insert on jobs
  for each row execute function log_job_activity();

drop trigger if exists jobs_activity_upd on jobs;
create trigger jobs_activity_upd before update on jobs
  for each row execute function log_job_activity();

-- -------------------------------------------------------------
-- 3. Statistik pipeline (dipakai halaman kanban & dashboard)
-- -------------------------------------------------------------

create or replace function job_pipeline_counts(p_job_id uuid)
returns table (stage_id uuid, total bigint)
language sql
stable
security invoker          -- sengaja: tetap tunduk pada RLS pemanggil
set search_path = public
as $$
  select a.stage_id, count(*)::bigint
  from applications a
  where a.job_id = p_job_id and a.status = 'active'
  group by a.stage_id
$$;

grant execute on function job_pipeline_counts(uuid) to authenticated;

-- -------------------------------------------------------------
-- 4. Storage buckets
-- -------------------------------------------------------------
-- resumes    : privat. Diakses hanya lewat signed URL berumur pendek.
-- org-assets : publik. Logo & banner career page.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-assets', 'org-assets', true, 2097152,
  array['image/png','image/jpeg','image/webp','image/svg+xml']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Konvensi path: {org_id}/{candidate_id}/{uuid}-{nama-file}
-- Anggota organisasi boleh membaca file di prefix org-nya sendiri.
drop policy if exists "resumes read by org members" on storage.objects;
create policy "resumes read by org members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1]::uuid in (select auth_org_ids())
  );

drop policy if exists "resumes write by org managers" on storage.objects;
create policy "resumes write by org managers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and can_manage_org((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "resumes delete by org managers" on storage.objects;
create policy "resumes delete by org managers" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resumes'
    and can_manage_org((storage.foldername(name))[1]::uuid)
  );

-- Upload dari pelamar publik TIDAK lewat policy ini; dilakukan di server
-- memakai service role setelah validasi Turnstile + Zod.

drop policy if exists "org assets public read" on storage.objects;
create policy "org assets public read" on storage.objects
  for select to public
  using (bucket_id = 'org-assets');

drop policy if exists "org assets write by managers" on storage.objects;
create policy "org assets write by managers" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-assets'
    and can_manage_org((storage.foldername(name))[1]::uuid)
  );

-- =============================================================
-- HireFlow — Migrasi 0002: Row Level Security
-- =============================================================
-- Prinsip: RLS adalah garis pertahanan utama, bukan pengecekan di kode.
-- Semua helper dibuat SECURITY DEFINER agar tidak terjadi rekursi policy
-- saat sebuah policy di org_members perlu membaca org_members.

-- -------------------------------------------------------------
-- Helper
-- -------------------------------------------------------------

create or replace function auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from org_members
  where user_id = auth.uid() and status = 'active'
$$;

create or replace function has_org_role(target_org uuid, roles org_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where user_id = auth.uid()
      and org_id  = target_org
      and status  = 'active'
      and role    = any(roles)
  )
$$;

-- "Bisa mengelola" = owner / admin / recruiter
create or replace function can_manage_org(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_org_role(target_org, array['owner','admin','recruiter']::org_role[])
$$;

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from org_members
    where user_id = auth.uid() and org_id = target_org and status = 'active'
  )
$$;

revoke all on function auth_org_ids()  from public;
revoke all on function has_org_role(uuid, org_role[]) from public;
revoke all on function can_manage_org(uuid) from public;
revoke all on function is_org_member(uuid) from public;
grant execute on function auth_org_ids()  to authenticated;
grant execute on function has_org_role(uuid, org_role[]) to authenticated;
grant execute on function can_manage_org(uuid) to authenticated;
grant execute on function is_org_member(uuid) to authenticated;

-- -------------------------------------------------------------
-- Aktifkan RLS di semua tabel
-- -------------------------------------------------------------

alter table profiles            enable row level security;
alter table organizations       enable row level security;
alter table org_members         enable row level security;
alter table departments         enable row level security;
alter table locations           enable row level security;
alter table jobs                enable row level security;
alter table job_members         enable row level security;
alter table job_stages          enable row level security;
alter table job_questions       enable row level security;
alter table candidates          enable row level security;
alter table candidate_documents enable row level security;
alter table applications        enable row level security;
alter table application_answers enable row level security;
alter table stage_history       enable row level security;
alter table notes               enable row level security;
alter table activities          enable row level security;

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------

drop policy if exists profiles_self_read on profiles;
create policy profiles_self_read on profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from org_members m
      where m.user_id = profiles.id and m.org_id in (select auth_org_ids())
    )
  );

drop policy if exists profiles_self_write on profiles;
create policy profiles_self_write on profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- -------------------------------------------------------------
-- organizations
-- -------------------------------------------------------------

drop policy if exists organizations_read on organizations;
create policy organizations_read on organizations
  for select to authenticated
  using (id in (select auth_org_ids()));

drop policy if exists organizations_update on organizations;
create policy organizations_update on organizations
  for update to authenticated
  using (has_org_role(id, array['owner','admin']::org_role[]))
  with check (has_org_role(id, array['owner','admin']::org_role[]));

drop policy if exists organizations_delete on organizations;
create policy organizations_delete on organizations
  for delete to authenticated
  using (has_org_role(id, array['owner']::org_role[]));

-- Insert organisasi TIDAK diizinkan langsung; pakai RPC create_organization()
-- supaya org + membership owner + data awal dibuat dalam satu transaksi.

-- -------------------------------------------------------------
-- org_members
-- -------------------------------------------------------------

drop policy if exists org_members_read on org_members;
create policy org_members_read on org_members
  for select to authenticated
  using (user_id = auth.uid() or org_id in (select auth_org_ids()));

drop policy if exists org_members_manage on org_members;
create policy org_members_manage on org_members
  for all to authenticated
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]));

-- -------------------------------------------------------------
-- Tabel referensi milik org
-- -------------------------------------------------------------

drop policy if exists departments_read on departments;
create policy departments_read on departments
  for select to authenticated using (is_org_member(org_id));

drop policy if exists departments_write on departments;
create policy departments_write on departments
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

drop policy if exists locations_read on locations;
create policy locations_read on locations
  for select to authenticated using (is_org_member(org_id));

drop policy if exists locations_write on locations;
create policy locations_write on locations
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

-- -------------------------------------------------------------
-- jobs
-- -------------------------------------------------------------

drop policy if exists jobs_read on jobs;
create policy jobs_read on jobs
  for select to authenticated using (is_org_member(org_id));

drop policy if exists jobs_write on jobs;
create policy jobs_write on jobs
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

drop policy if exists job_members_read on job_members;
create policy job_members_read on job_members
  for select to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and is_org_member(j.org_id)));

drop policy if exists job_members_write on job_members;
create policy job_members_write on job_members
  for all to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)))
  with check (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)));

drop policy if exists job_stages_read on job_stages;
create policy job_stages_read on job_stages
  for select to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and is_org_member(j.org_id)));

drop policy if exists job_stages_write on job_stages;
create policy job_stages_write on job_stages
  for all to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)))
  with check (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)));

drop policy if exists job_questions_read on job_questions;
create policy job_questions_read on job_questions
  for select to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and is_org_member(j.org_id)));

drop policy if exists job_questions_write on job_questions;
create policy job_questions_write on job_questions
  for all to authenticated
  using (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)))
  with check (exists (select 1 from jobs j where j.id = job_id and can_manage_org(j.org_id)));

-- -------------------------------------------------------------
-- candidates & applications
-- -------------------------------------------------------------
-- Catatan peran:
--  * agency    -> hanya kandidat yang ia submit sendiri
--  * interviewer -> (disiapkan untuk Fase 4) sementara sama seperti anggota biasa

drop policy if exists candidates_read on candidates;
create policy candidates_read on candidates
  for select to authenticated
  using (
    is_org_member(org_id)
    and (
      not has_org_role(org_id, array['agency']::org_role[])
      or exists (
        select 1 from applications a
        where a.candidate_id = candidates.id
          and a.submitted_by_agency = auth.uid()
      )
    )
  );

drop policy if exists candidates_write on candidates;
create policy candidates_write on candidates
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

drop policy if exists candidate_documents_read on candidate_documents;
create policy candidate_documents_read on candidate_documents
  for select to authenticated
  using (
    is_org_member(org_id)
    and exists (select 1 from candidates c where c.id = candidate_id)
  );

drop policy if exists candidate_documents_write on candidate_documents;
create policy candidate_documents_write on candidate_documents
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

drop policy if exists applications_read on applications;
create policy applications_read on applications
  for select to authenticated
  using (
    is_org_member(org_id)
    and (
      not has_org_role(org_id, array['agency']::org_role[])
      or submitted_by_agency = auth.uid()
    )
  );

drop policy if exists applications_write on applications;
create policy applications_write on applications
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

drop policy if exists application_answers_read on application_answers;
create policy application_answers_read on application_answers
  for select to authenticated
  using (exists (
    select 1 from applications a where a.id = application_id and is_org_member(a.org_id)
  ));

drop policy if exists application_answers_write on application_answers;
create policy application_answers_write on application_answers
  for all to authenticated
  using (exists (
    select 1 from applications a where a.id = application_id and can_manage_org(a.org_id)
  ))
  with check (exists (
    select 1 from applications a where a.id = application_id and can_manage_org(a.org_id)
  ));

-- stage_history: read-only lewat API. Penulisan hanya dari trigger.
drop policy if exists stage_history_read on stage_history;
create policy stage_history_read on stage_history
  for select to authenticated using (is_org_member(org_id));

-- -------------------------------------------------------------
-- notes
-- -------------------------------------------------------------

drop policy if exists notes_read on notes;
create policy notes_read on notes
  for select to authenticated using (is_org_member(org_id));

drop policy if exists notes_insert on notes;
create policy notes_insert on notes
  for insert to authenticated
  with check (is_org_member(org_id) and author_id = auth.uid());

drop policy if exists notes_modify on notes;
create policy notes_modify on notes
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists notes_delete on notes;
create policy notes_delete on notes
  for delete to authenticated
  using (author_id = auth.uid() or has_org_role(org_id, array['owner','admin']::org_role[]));

-- -------------------------------------------------------------
-- activities (audit log) — read-only, tidak bisa diubah lewat API
-- -------------------------------------------------------------

drop policy if exists activities_read on activities;
create policy activities_read on activities
  for select to authenticated using (is_org_member(org_id));

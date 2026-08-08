-- =============================================================
-- HireFlow — Migrasi 0001: Skema inti
-- =============================================================
-- Menjalankan file ini aman untuk diulang selama belum ada data.
-- Urutan: extensions -> tipe -> tabel -> index -> fungsi -> trigger

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- -------------------------------------------------------------
-- 1. Identitas & tenancy
-- -------------------------------------------------------------

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  avatar_url text,
  phone      text,
  timezone   text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now()
);

comment on table profiles is 'Profil publik user, 1:1 dengan auth.users.';

create table if not exists organizations (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  logo_url      text,
  website       text,
  about         text,
  brand_color   text not null default '#1a56db',
  custom_domain citext unique,
  plan          text not null default 'free',
  settings      jsonb not null default '{}'::jsonb,
  created_by    uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint organizations_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$')
);

comment on column organizations.slug is 'Dipakai sebagai URL career page: /{slug}';

do $$ begin
  create type org_role as enum
    ('owner','admin','recruiter','hiring_manager','interviewer','agency','viewer');
exception when duplicate_object then null; end $$;

create table if not exists org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       org_role not null default 'recruiter',
  status     text not null default 'active'
    check (status in ('active','invited','suspended')),
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists org_members_user_idx on org_members (user_id, status);

create table if not exists departments (
  id     uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name   text not null,
  unique (org_id, name)
);

create table if not exists locations (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations(id) on delete cascade,
  name      text not null,
  country   text not null default 'ID',
  is_remote boolean not null default false,
  unique (org_id, name)
);

-- -------------------------------------------------------------
-- 2. Job & pipeline
-- -------------------------------------------------------------

do $$ begin
  create type job_status as enum
    ('draft','pending_approval','approved','published','on_hold','closed','archived');
exception when duplicate_object then null; end $$;

create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  slug            text not null,
  title           text not null,
  department_id   uuid references departments(id) on delete set null,
  location_id     uuid references locations(id) on delete set null,
  work_mode       text not null default 'onsite'
    check (work_mode in ('onsite','hybrid','remote')),
  employment_type text not null default 'full_time'
    check (employment_type in
      ('full_time','part_time','contract','internship','freelance')),
  description     text not null default '',
  requirements    text not null default '',
  benefits        text not null default '',
  required_skills text[] not null default '{}',
  min_years_exp   numeric(4,1),
  salary_min      bigint,
  salary_max      bigint,
  salary_currency text not null default 'IDR',
  salary_visible  boolean not null default false,
  openings        integer not null default 1 check (openings > 0),
  status          job_status not null default 'draft',
  published_at    timestamptz,
  closes_at       timestamptz,
  owner_id        uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (org_id, slug),
  constraint jobs_salary_range check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index if not exists jobs_org_status_idx on jobs (org_id, status);
create index if not exists jobs_published_idx on jobs (org_id, published_at desc)
  where status = 'published';

create table if not exists job_members (
  job_id  uuid not null references jobs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role    text not null default 'hiring_manager',
  primary key (job_id, user_id)
);

create table if not exists job_stages (
  id       uuid primary key default gen_random_uuid(),
  job_id   uuid not null references jobs(id) on delete cascade,
  name     text not null,
  position integer not null,
  kind     text not null default 'custom'
    check (kind in
      ('applied','screening','interview','assessment','offer','hired','rejected','custom')),
  sla_days integer,
  -- deferrable: reorder banyak stage dalam satu transaksi tidak bentrok
  constraint job_stages_position_uniq unique (job_id, position)
    deferrable initially immediate
);

create index if not exists job_stages_job_idx on job_stages (job_id, position);

create table if not exists job_questions (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  label         text not null,
  help_text     text,
  type          text not null default 'text'
    check (type in ('text','textarea','select','multiselect','number','boolean','url')),
  options       jsonb not null default '[]'::jsonb,
  required      boolean not null default false,
  is_knockout   boolean not null default false,
  knockout_rule jsonb,        -- {"op":"eq"|"neq"|"lt"|"gt","value":...}
  position      integer not null default 0
);

create index if not exists job_questions_job_idx on job_questions (job_id, position);

-- -------------------------------------------------------------
-- 3. Kandidat & lamaran
-- -------------------------------------------------------------

create table if not exists candidates (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  full_name     text not null,
  email         citext not null,
  phone         text,
  phone_e164    text,
  headline      text,
  location_text text,
  linkedin_url  text,
  portfolio_url text,
  years_exp     numeric(4,1),
  skills        text[] not null default '{}',
  education     jsonb not null default '[]'::jsonb,
  experience    jsonb not null default '[]'::jsonb,
  source        text not null default 'career_page',
  source_detail text,
  tags          text[] not null default '{}',
  consent_at    timestamptz,
  consent_version text,
  anonymized_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (org_id, email)
);

create index if not exists candidates_name_trgm
  on candidates using gin (full_name gin_trgm_ops);
create index if not exists candidates_skills_idx
  on candidates using gin (skills);
create index if not exists candidates_org_phone_idx
  on candidates (org_id, phone_e164);
create index if not exists candidates_org_created_idx
  on candidates (org_id, created_at desc);

create table if not exists candidate_documents (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  kind         text not null default 'resume'
    check (kind in ('resume','cover_letter','portfolio','certificate','other')),
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   integer,
  parsed_text  text,
  parsed_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists candidate_documents_candidate_idx
  on candidate_documents (candidate_id, created_at desc);

do $$ begin
  create type application_status as enum
    ('active','hired','rejected','withdrawn','on_hold');
exception when duplicate_object then null; end $$;

create table if not exists applications (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references organizations(id) on delete cascade,
  job_id              uuid not null references jobs(id) on delete cascade,
  candidate_id        uuid not null references candidates(id) on delete cascade,
  stage_id            uuid references job_stages(id) on delete set null,
  status              application_status not null default 'active',
  ai_score            smallint check (ai_score between 0 and 100),
  ai_reasoning        jsonb,
  avg_rating          numeric(3,2),
  rejection_reason    text,
  rejected_at         timestamptz,
  submitted_by_agency uuid references profiles(id) on delete set null,
  cover_letter        text,
  applied_at          timestamptz not null default now(),
  stage_entered_at    timestamptz not null default now(),
  last_activity_at    timestamptz not null default now(),
  access_token        text not null unique
    default encode(gen_random_bytes(24), 'hex'),
  unique (job_id, candidate_id)
);

create index if not exists applications_pipeline_idx
  on applications (job_id, stage_id) where status = 'active';
create index if not exists applications_org_activity_idx
  on applications (org_id, last_activity_at desc);
create index if not exists applications_candidate_idx
  on applications (candidate_id);

create table if not exists application_answers (
  application_id uuid not null references applications(id) on delete cascade,
  question_id    uuid not null references job_questions(id) on delete cascade,
  answer         jsonb not null,
  primary key (application_id, question_id)
);

create table if not exists stage_history (
  id             bigserial primary key,
  org_id         uuid not null references organizations(id) on delete cascade,
  application_id uuid not null references applications(id) on delete cascade,
  from_stage_id  uuid references job_stages(id) on delete set null,
  to_stage_id    uuid references job_stages(id) on delete set null,
  moved_by       uuid references profiles(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists stage_history_app_idx
  on stage_history (application_id, created_at desc);

-- -------------------------------------------------------------
-- 4. Kolaborasi & audit
-- -------------------------------------------------------------

create table if not exists notes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizations(id) on delete cascade,
  application_id uuid references applications(id) on delete cascade,
  candidate_id   uuid references candidates(id) on delete cascade,
  author_id      uuid not null references profiles(id) on delete cascade,
  body           text not null check (length(btrim(body)) > 0),
  mentions       uuid[] not null default '{}',
  created_at     timestamptz not null default now(),
  constraint notes_target_present
    check (application_id is not null or candidate_id is not null)
);

create index if not exists notes_application_idx
  on notes (application_id, created_at desc);

create table if not exists activities (
  id          bigserial primary key,
  org_id      uuid not null references organizations(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id   uuid not null,
  action      text not null,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activities_org_idx on activities (org_id, created_at desc);
create index if not exists activities_entity_idx
  on activities (entity_type, entity_id, created_at desc);

-- -------------------------------------------------------------
-- 5. Fungsi & trigger
-- -------------------------------------------------------------

-- Buat baris profiles otomatis saat user auth baru mendaftar
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- updated_at otomatis
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists jobs_touch on jobs;
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

drop trigger if exists candidates_touch on candidates;
create trigger candidates_touch before update on candidates
  for each row execute function touch_updated_at();

-- Turunkan org_id dari job supaya tidak bisa dipalsukan lintas tenant
create or replace function set_application_org()
returns trigger language plpgsql as $$
declare
  v_org uuid;
begin
  select org_id into v_org from jobs where id = new.job_id;
  if v_org is null then
    raise exception 'Job % tidak ditemukan', new.job_id;
  end if;
  new.org_id := v_org;

  -- kandidat harus berada di organisasi yang sama
  if not exists (
    select 1 from candidates c where c.id = new.candidate_id and c.org_id = v_org
  ) then
    raise exception 'Kandidat bukan milik organisasi job ini';
  end if;

  -- stage harus milik job ini
  if new.stage_id is not null and not exists (
    select 1 from job_stages s where s.id = new.stage_id and s.job_id = new.job_id
  ) then
    raise exception 'Stage bukan milik job ini';
  end if;

  return new;
end $$;

drop trigger if exists applications_set_org on applications;
create trigger applications_set_org
  before insert or update of job_id, candidate_id, stage_id on applications
  for each row execute function set_application_org();

-- Catat perpindahan stage + audit trail
create or replace function log_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage_id is distinct from old.stage_id then
    insert into stage_history (org_id, application_id, from_stage_id, to_stage_id, moved_by)
      values (new.org_id, new.id, old.stage_id, new.stage_id, auth.uid());

    insert into activities (org_id, actor_id, entity_type, entity_id, action, metadata)
      values (new.org_id, auth.uid(), 'application', new.id, 'stage_moved',
              jsonb_build_object('from', old.stage_id, 'to', new.stage_id));

    new.stage_entered_at := now();
  end if;

  if new.status is distinct from old.status then
    insert into activities (org_id, actor_id, entity_type, entity_id, action, metadata)
      values (new.org_id, auth.uid(), 'application', new.id, 'status_changed',
              jsonb_build_object('from', old.status, 'to', new.status));
    if new.status = 'rejected' and old.status <> 'rejected' then
      new.rejected_at := now();
    end if;
  end if;

  new.last_activity_at := now();
  return new;
end $$;

drop trigger if exists applications_stage_change on applications;
create trigger applications_stage_change
  before update on applications
  for each row execute function log_stage_change();

-- Stage default saat job dibuat
create or replace function create_default_stages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into job_stages (job_id, name, position, kind) values
    (new.id, 'Pelamar Baru', 1, 'applied'),
    (new.id, 'Screening',    2, 'screening'),
    (new.id, 'Interview',    3, 'interview'),
    (new.id, 'Penawaran',    4, 'offer'),
    (new.id, 'Diterima',     5, 'hired');
  return new;
end $$;

drop trigger if exists jobs_default_stages on jobs;
create trigger jobs_default_stages
  after insert on jobs
  for each row execute function create_default_stages();

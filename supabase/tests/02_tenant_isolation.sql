-- =============================================================
-- Test isolasi multi-tenant
-- =============================================================
-- Membuktikan bahwa anggota Organisasi A tidak bisa membaca ATAU menulis
-- data Organisasi B, meski memakai koneksi database langsung.
--
-- Jalankan: bash supabase/tests/run.sh
-- Semua assertion memakai RAISE EXCEPTION, jadi test gagal = script gagal.

\set ON_ERROR_STOP on

-- ---------- Persiapan data ----------
set role postgres;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'andi@org-a.test'),
  ('22222222-2222-2222-2222-222222222222', 'budi@org-b.test'),
  ('33333333-3333-3333-3333-333333333333', 'citra@org-a.test');

-- profiles dibuat otomatis oleh trigger on_auth_user_created

insert into organizations (id, slug, name) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'org-a', 'Organisasi A'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'org-b', 'Organisasi B');

insert into org_members (org_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', 'viewer');

insert into jobs (id, org_id, slug, title, status) values
  ('a0000000-0000-0000-0000-0000000000a1',
   'aaaaaaaa-0000-0000-0000-00000000000a', 'backend', 'Backend Engineer', 'published'),
  ('b0000000-0000-0000-0000-0000000000b1',
   'bbbbbbbb-0000-0000-0000-00000000000b', 'frontend', 'Frontend Engineer', 'published');

insert into candidates (id, org_id, full_name, email) values
  ('c0000000-0000-0000-0000-0000000000a1',
   'aaaaaaaa-0000-0000-0000-00000000000a', 'Kandidat A', 'kandidat-a@mail.test'),
  ('c0000000-0000-0000-0000-0000000000b1',
   'bbbbbbbb-0000-0000-0000-00000000000b', 'Kandidat B', 'kandidat-b@mail.test');

insert into applications (id, job_id, candidate_id, stage_id)
select 'd0000000-0000-0000-0000-0000000000a1',
       'a0000000-0000-0000-0000-0000000000a1',
       'c0000000-0000-0000-0000-0000000000a1',
       (select id from job_stages
        where job_id = 'a0000000-0000-0000-0000-0000000000a1' and position = 1);

insert into applications (id, job_id, candidate_id, stage_id)
select 'd0000000-0000-0000-0000-0000000000b1',
       'b0000000-0000-0000-0000-0000000000b1',
       'c0000000-0000-0000-0000-0000000000b1',
       (select id from job_stages
        where job_id = 'b0000000-0000-0000-0000-0000000000b1' and position = 1);

-- ---------- Helper assertion ----------
create or replace function assert_eq(actual bigint, expected bigint, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'GAGAL: % -> dapat %, seharusnya %', label, actual, expected;
  end if;
  raise notice 'OK  %  (=%)', label, actual;
end $$;

create or replace function assert_blocked(stmt text, label text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'OK  % (ditolak: %)', label, left(sqlerrm, 60);
    return;
  end;
  raise exception 'GAGAL: % -> operasi BERHASIL padahal seharusnya ditolak', label;
end $$;

-- UPDATE/DELETE yang tidak menemukan baris karena RLS TIDAK melempar error,
-- melainkan mengenai 0 baris. Ini helper untuk kasus tersebut.
create or replace function assert_no_rows(stmt text, label text)
returns void language plpgsql as $$
declare n integer;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'GAGAL: % -> % baris terpengaruh, seharusnya 0', label, n;
  end if;
  raise notice 'OK  % (0 baris terpengaruh)', label;
end $$;

-- =============================================================
-- Sebagai Andi (owner Organisasi A)
-- =============================================================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select assert_eq((select count(*) from organizations), 1, 'Andi hanya lihat 1 organisasi');
select assert_eq((select count(*) from jobs), 1, 'Andi hanya lihat 1 job');
select assert_eq((select count(*) from candidates), 1, 'Andi hanya lihat 1 kandidat');
select assert_eq((select count(*) from applications), 1, 'Andi hanya lihat 1 lamaran');
select assert_eq(
  (select count(*) from jobs where title = 'Frontend Engineer'), 0,
  'Andi TIDAK bisa lihat job Organisasi B');
select assert_eq((select count(*) from job_stages), 5, 'Andi lihat 5 stage default job-nya');

-- =============================================================
-- Sebagai Budi (owner Organisasi B)
-- =============================================================
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select assert_eq((select count(*) from jobs), 1, 'Budi hanya lihat 1 job');
select assert_eq(
  (select count(*) from jobs where title = 'Backend Engineer'), 0,
  'Budi TIDAK bisa lihat job Organisasi A');
select assert_eq(
  (select count(*) from candidates where full_name = 'Kandidat A'), 0,
  'Budi TIDAK bisa lihat kandidat Organisasi A');

-- Percobaan menulis lintas tenant
select assert_blocked(
  $q$ insert into jobs (org_id, slug, title)
      values ('aaaaaaaa-0000-0000-0000-00000000000a','sisipan','Job Sisipan') $q$,
  'Budi TIDAK bisa membuat job di Organisasi A');

select assert_blocked(
  $q$ insert into candidates (org_id, full_name, email)
      values ('aaaaaaaa-0000-0000-0000-00000000000a','Palsu','palsu@mail.test') $q$,
  'Budi TIDAK bisa menambah kandidat di Organisasi A');

select assert_no_rows(
  $q$ update jobs set title = 'Diretas'
      where id = 'a0000000-0000-0000-0000-0000000000a1' $q$,
  'Budi TIDAK bisa mengubah job Organisasi A');

select assert_blocked(
  $q$ insert into org_members (org_id, user_id, role)
      values ('aaaaaaaa-0000-0000-0000-00000000000a',
              '22222222-2222-2222-2222-222222222222','owner') $q$,
  'Budi TIDAK bisa menyusup jadi anggota Organisasi A');

select assert_no_rows(
  $q$ update candidates set full_name = 'Diretas'
      where org_id = 'aaaaaaaa-0000-0000-0000-00000000000a' $q$,
  'Budi TIDAK bisa mengubah kandidat Organisasi A');

select assert_no_rows(
  $q$ delete from applications
      where org_id = 'aaaaaaaa-0000-0000-0000-00000000000a' $q$,
  'Budi TIDAK bisa menghapus lamaran Organisasi A');

-- =============================================================
-- Sebagai Citra (viewer di Organisasi A) — boleh baca, tidak boleh tulis
-- =============================================================
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

select assert_eq((select count(*) from jobs), 1, 'Citra (viewer) bisa baca job org-nya');

select assert_blocked(
  $q$ insert into jobs (org_id, slug, title)
      values ('aaaaaaaa-0000-0000-0000-00000000000a','viewer-job','Job dari Viewer') $q$,
  'Citra (viewer) TIDAK bisa membuat job');

select assert_no_rows(
  $q$ delete from candidates
      where id = 'c0000000-0000-0000-0000-0000000000a1' $q$,
  'Citra (viewer) TIDAK bisa menghapus kandidat');

select assert_no_rows(
  $q$ update jobs set title = 'Diubah Viewer'
      where id = 'a0000000-0000-0000-0000-0000000000a1' $q$,
  'Citra (viewer) TIDAK bisa mengubah job');

-- =============================================================
-- Trigger integritas lintas tenant
-- =============================================================
set role postgres;
reset request.jwt.claim.sub;

select assert_blocked(
  $q$ insert into applications (job_id, candidate_id)
      values ('a0000000-0000-0000-0000-0000000000a1',
              'c0000000-0000-0000-0000-0000000000b1') $q$,
  'Kandidat Org B TIDAK bisa dipasang ke job Org A (trigger)');

select assert_blocked(
  $q$ insert into applications (job_id, candidate_id, stage_id)
      values ('a0000000-0000-0000-0000-0000000000a1',
              'c0000000-0000-0000-0000-0000000000a1',
              (select id from job_stages
               where job_id = 'b0000000-0000-0000-0000-0000000000b1' limit 1)) $q$,
  'Stage milik job lain TIDAK bisa dipakai (trigger)');

-- =============================================================
-- Riwayat stage & audit log terisi otomatis
-- =============================================================
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

update applications
  set stage_id = (select id from job_stages
                  where job_id = 'a0000000-0000-0000-0000-0000000000a1' and position = 2)
  where id = 'd0000000-0000-0000-0000-0000000000a1';

select assert_eq(
  (select count(*) from stage_history
   where application_id = 'd0000000-0000-0000-0000-0000000000a1'), 1,
  'Perpindahan stage tercatat di stage_history');

select assert_eq(
  (select count(*) from activities
   where entity_id = 'd0000000-0000-0000-0000-0000000000a1' and action = 'stage_moved'), 1,
  'Perpindahan stage tercatat di audit log');

-- Audit log tidak bisa dipalsukan lewat API
select assert_blocked(
  $q$ insert into activities (org_id, entity_type, entity_id, action)
      values ('aaaaaaaa-0000-0000-0000-00000000000a','job',
              'a0000000-0000-0000-0000-0000000000a1','palsu') $q$,
  'Audit log TIDAK bisa disisipi manual');

select assert_no_rows(
  $q$ delete from activities where org_id = 'aaaaaaaa-0000-0000-0000-00000000000a' $q$,
  'Audit log TIDAK bisa dihapus');

select assert_no_rows(
  $q$ update stage_history set note = 'diubah'
      where org_id = 'aaaaaaaa-0000-0000-0000-00000000000a' $q$,
  'Riwayat stage TIDAK bisa diubah');

set role postgres;

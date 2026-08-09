-- =============================================================
-- Mode kerja yang bisa dikelola sendiri
--
-- Sebelumnya nilainya dikunci di tiga tempat: check constraint di sini,
-- WORK_MODE_LABEL di utils.ts, dan daftar <option> di form lowongan. Ketiganya
-- berisi istilah pekerjaan kantoran — onsite, hybrid, remote — yang tidak
-- cocok untuk perusahaan pertambangan yang mengenal site dan roster.
--
-- Nilainya sekarang diambil dari tabel, dan lowongan menyimpan LABEL-nya
-- sebagai teks, bukan referensi ke baris tabel. Artinya mengganti nama sebuah
-- mode tidak mengubah lowongan lama — lowongan yang sudah terbit merekam
-- istilah yang berlaku saat itu diterbitkan.
-- =============================================================

create table if not exists work_modes (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references organizations(id) on delete cascade,
  name      text not null,
  -- Dipakai untuk data terstruktur Google Jobs: jobLocationType TELECOMMUTE
  -- hanya boleh dipasang pada lowongan yang benar-benar jarak jauh.
  is_remote boolean not null default false,
  position  integer not null default 0,
  unique (org_id, name)
);

create index if not exists work_modes_org_idx on work_modes (org_id, position);

alter table work_modes enable row level security;

drop policy if exists work_modes_read on work_modes;
create policy work_modes_read on work_modes
  for select to authenticated using (is_org_member(org_id));

drop policy if exists work_modes_write on work_modes;
create policy work_modes_write on work_modes
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

-- -------------------------------------------------------------
-- Lepaskan penguncian nilai di kolom jobs.work_mode
--
-- Kolomnya tetap text dan tetap wajib diisi; yang dilepas hanya daftar nilai
-- yang boleh masuk. Tanpa ini, istilah baru seperti "Roster" akan ditolak
-- database meski sudah ada di tabel work_modes.
-- -------------------------------------------------------------
-- Namanya dicari lewat katalog, bukan ditebak. Postgres memang menamai check
-- constraint inline sebagai {tabel}_{kolom}_check, tapi kalau tebakan itu
-- meleset, constraint-nya tidak terlepas dan istilah baru akan ditolak
-- database tanpa penjelasan yang jelas.
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'jobs'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%work_mode%';

  if v_name is not null then
    execute format('alter table jobs drop constraint %I', v_name);
  end if;
end $$;

-- -------------------------------------------------------------
-- Isi awal untuk setiap organisasi yang sudah ada
--
-- Istilah pertambangan, bukan pekerjaan kantoran. Aman dijalankan berulang
-- karena unique (org_id, name) dilindungi on conflict do nothing.
-- -------------------------------------------------------------
insert into work_modes (org_id, name, is_remote, position)
select o.id, v.name, v.is_remote, v.position
from organizations o
cross join (values
  ('Site / Lapangan', false, 1),
  ('Roster',          false, 2),
  ('Kantor',          false, 3),
  ('Hybrid',          false, 4),
  ('Remote',          true,  5)
) as v(name, is_remote, position)
on conflict (org_id, name) do nothing;

-- -------------------------------------------------------------
-- Pindahkan lowongan lama dari kode ke label
--
-- Nilai lama berupa kode pendek ('onsite'), sedangkan nilai baru berupa label
-- yang langsung ditampilkan. Tanpa langkah ini, lowongan lama akan menampilkan
-- 'onsite' mentah di career page.
-- -------------------------------------------------------------
update jobs set work_mode = 'Kantor' where work_mode = 'onsite';
update jobs set work_mode = 'Hybrid' where work_mode = 'hybrid';
update jobs set work_mode = 'Remote' where work_mode = 'remote';

-- =============================================================
-- Template pesan WhatsApp per tahap
--
-- Dipakai untuk tautan wa.me (klik-untuk-chat), bukan pengiriman otomatis.
-- Recruiter menekan tombol, WhatsApp terbuka dengan pesan sudah terisi, lalu
-- ia sendiri yang menekan kirim.
--
-- Pilihan itu disengaja. Pengiriman otomatis menuntut WhatsApp Cloud API:
-- nomor khusus yang tidak bisa dipakai di aplikasi biasa, verifikasi bisnis
-- Meta, dan setiap template harus ditinjau Meta sebelum boleh dipakai. Karena
-- kandidat tidak pernah menghubungi duluan, semua notifikasi terhitung
-- business-initiated sehingga wajib template dan berbayar per pesan.
--
-- Template dicocokkan dengan NAMA tahap, bukan id, supaya satu template
-- melayani semua lowongan — tahapan bawaan setiap lowongan bernama sama.
-- =============================================================

create table if not exists whatsapp_templates (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  stage_name text not null,
  body       text not null default '',
  created_at timestamptz not null default now(),
  unique (org_id, stage_name)
);

create index if not exists whatsapp_templates_org_idx
  on whatsapp_templates (org_id, stage_name);

alter table whatsapp_templates enable row level security;

drop policy if exists whatsapp_templates_read on whatsapp_templates;
create policy whatsapp_templates_read on whatsapp_templates
  for select to authenticated using (is_org_member(org_id));

drop policy if exists whatsapp_templates_write on whatsapp_templates;
create policy whatsapp_templates_write on whatsapp_templates
  for all to authenticated
  using (can_manage_org(org_id)) with check (can_manage_org(org_id));

-- -------------------------------------------------------------
-- Isi awal untuk tahapan bawaan
--
-- Penanda yang dikenali: {nama} {posisi} {perusahaan} {tahap}
-- Nadanya sengaja hangat dan tidak menjanjikan apa pun — pesan rekrutmen yang
-- terlalu formal sering dikira penipuan, tapi yang terlalu menjanjikan
-- menimbulkan harapan yang belum tentu bisa dipenuhi.
-- -------------------------------------------------------------
insert into whatsapp_templates (org_id, stage_name, body)
select o.id, v.stage_name, v.body
from organizations o
cross join (values
  ('Pelamar Baru',
   'Halo {nama}, terima kasih sudah melamar posisi {posisi} di {perusahaan}. Lamaran kamu sudah kami terima dan sedang kami tinjau. Kami akan menghubungi kembali setelah proses peninjauan selesai.'),
  ('Screening',
   'Halo {nama}, lamaran kamu untuk posisi {posisi} di {perusahaan} sedang dalam tahap penyaringan. Kami mungkin akan menghubungi untuk menanyakan beberapa hal. Terima kasih atas kesabarannya.'),
  ('Interview',
   'Halo {nama}, kabar baik. Kami ingin mengundang kamu untuk wawancara posisi {posisi} di {perusahaan}. Boleh kami tahu waktu yang cocok untuk kamu dalam beberapa hari ke depan?'),
  ('Penawaran',
   'Halo {nama}, selamat! Setelah proses seleksi, kami ingin menawarkan posisi {posisi} di {perusahaan} kepada kamu. Kami akan mengirimkan rincian penawarannya. Ada yang ingin ditanyakan lebih dulu?'),
  ('Diterima',
   'Halo {nama}, selamat bergabung di {perusahaan} sebagai {posisi}. Kami akan menghubungi kamu untuk langkah berikutnya terkait persiapan bergabung.')
) as v(stage_name, body)
on conflict (org_id, stage_name) do nothing;

-- =============================================================
-- Rate limit form lamaran publik
--
-- Sebelumnya rate limit disimpan di Map dalam memori proses. Itu hanya
-- bekerja kalau aplikasi berjalan sebagai satu instance yang berumur panjang.
-- Di Cloudflare Workers setiap isolate punya memorinya sendiri dan berumur
-- pendek, jadi batasnya praktis hilang — form lamaran yang terbuka ke
-- internet jadi tanpa perlindungan sama sekali.
--
-- Penghitungnya dipindahkan ke sini supaya berlaku lintas instance, dan
-- tetap benar di platform mana pun kalau suatu saat pindah dari Cloudflare.
-- =============================================================

create table if not exists rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

create index if not exists rate_limits_window_idx on rate_limits (window_start);

-- Tidak ada policy sama sekali: tabel ini hanya boleh disentuh service role,
-- yang melewati RLS. RLS tetap dinyalakan supaya anon/authenticated tertutup
-- rapat kalau suatu saat tabel ini tanpa sengaja diekspos.
alter table rate_limits enable row level security;

/**
 * Menaikkan penghitung untuk sebuah kunci dan mengembalikan apakah batas
 * sudah terlampaui.
 *
 * Seluruh operasi dilakukan dalam satu pernyataan INSERT ... ON CONFLICT
 * supaya atomik. Membaca lalu menulis dalam dua langkah terpisah membuka
 * celah balapan: dua permintaan bersamaan bisa sama-sama membaca angka lama
 * dan sama-sama lolos.
 *
 * Mengembalikan true kalau permintaan HARUS DITOLAK.
 */
create or replace function check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_expired boolean;
begin
  insert into rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set
      -- Jendela lama sudah lewat? Mulai hitungan dari satu lagi.
      count = case
        when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then 1
        else rl.count + 1
      end,
      window_start = case
        when rl.window_start < now() - make_interval(secs => p_window_seconds)
        then now()
        else rl.window_start
      end
  returning rl.count into v_count;

  -- Pembersihan sesekali supaya tabel tidak tumbuh selamanya. Dijalankan
  -- kira-kira satu dari seratus panggilan; tidak perlu presisi, hanya perlu
  -- terjadi cukup sering.
  if random() < 0.01 then
    delete from rate_limits
    where window_start < now() - interval '7 days';
  end if;

  return v_count > p_max;
end $$;

revoke all on function check_rate_limit(text, integer, integer) from public;
revoke all on function check_rate_limit(text, integer, integer) from anon;
revoke all on function check_rate_limit(text, integer, integer) from authenticated;
grant execute on function check_rate_limit(text, integer, integer) to service_role;

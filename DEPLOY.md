# Deploy ke Cloudflare Workers

Aplikasi ini dideploy lewat [OpenNext](https://opennext.js.org/cloudflare),
adapter resmi Cloudflare untuk Next.js.

Hasil pengukuran pada build terakhir:

```
Total Upload: 8391.77 KiB / gzip: 1713.75 KiB
```

**1,67 MiB gzip.** Batas Workers adalah 3 MiB di plan gratis dan 10 MiB di
plan berbayar, jadi muat di plan gratis dengan sisa ruang sekitar 44%.

---

## Langkah 0 — Jalankan migrasi 0004 (WAJIB, sebelum deploy)

Rate limit form lamaran dipindahkan dari memori proses ke Postgres. Tanpa
migrasi ini, setiap pengiriman lamaran akan gagal memeriksa rate limit dan
form berjalan **tanpa perlindungan sama sekali**.

DDL tidak bisa dijalankan lewat PostgREST, jadi ini harus manual:

1. Buka Supabase Dashboard → **SQL Editor**
2. Tempel seluruh isi [`supabase/migrations/0004_rate_limit.sql`](./supabase/migrations/0004_rate_limit.sql)
3. Jalankan

Verifikasi berhasil — perintah ini harus mengembalikan `false`, bukan 404:

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/check_rate_limit" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_key":"probe","p_max":10,"p_window_seconds":3600}'
```

---

## Langkah 1 — Login Cloudflare

```bash
npx wrangler login
```

Membuka browser untuk otorisasi. Pastikan akun yang dipilih benar.

---

## Langkah 2 — Pasang secret runtime

Dua nilai ini **tidak boleh** masuk ke bundle browser, jadi dipasang sebagai
secret Workers, bukan variabel build:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put CRON_SECRET
```

Nilainya sama persis dengan yang ada di `.env.local`.

---

## Langkah 3 — Deploy pertama

```bash
npm run deploy
```

Perintah ini menjalankan `opennextjs-cloudflare build` lalu deploy. Setelah
selesai, Wrangler mencetak URL Worker, biasanya:

```
https://hireflow.<subdomain-anda>.workers.dev
```

---

## Langkah 4 — Perbaiki NEXT_PUBLIC_SITE_URL, lalu deploy ulang

**Ini jebakan yang paling sering terlewat.**

`NEXT_PUBLIC_SITE_URL` masih berisi `http://localhost:3000`. Nilainya dipakai
untuk link di email dan redirect autentikasi. Karena berawalan
`NEXT_PUBLIC_`, nilainya **di-inline ke bundle saat build** — memasangnya
sebagai secret Workers tidak akan berpengaruh apa pun.

Jadi urutannya harus:

1. Ubah `.env.local`:
   ```
   NEXT_PUBLIC_SITE_URL=https://hireflow.<subdomain-anda>.workers.dev
   ```
2. Deploy ulang: `npm run deploy`

Hal yang sama berlaku untuk `NEXT_PUBLIC_SUPABASE_URL` dan
`NEXT_PUBLIC_SUPABASE_ANON_KEY` — keduanya ikut ter-build dari `.env.local`,
bukan dari secret.

---

## Langkah 5 — Daftarkan URL di Supabase Auth

Supabase menolak redirect ke domain yang tidak terdaftar, sehingga login akan
gagal diam-diam kalau langkah ini dilewat.

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://hireflow.<subdomain-anda>.workers.dev`
- **Redirect URLs**: tambahkan `https://hireflow.<subdomain-anda>.workers.dev/**`

---

## Langkah 6 — Aktifkan keepalive

Supabase Free mem-pause project setelah 7 hari tanpa aktivitas database.
Workflow [`.github/workflows/keepalive.yml`](./.github/workflows/keepalive.yml)
memanggil `/api/cron/keepalive` setiap 6 jam untuk mencegahnya.

Isi secret di GitHub → Settings → Secrets and variables → Actions:

| Secret | Nilai |
|---|---|
| `APP_URL` | `https://hireflow.<subdomain-anda>.workers.dev` |
| `CRON_SECRET` | sama dengan yang di `.env.local` |

---

## Pratinjau lokal sebelum deploy

Menjalankan Worker yang sudah dibangun di runtime `workerd` asli, bukan
Node.js — jadi masalah kompatibilitas ketahuan sebelum sampai produksi:

```bash
cp .dev.vars.example .dev.vars   # lalu isi nilainya
npm run preview
```

---

## Keputusan yang sudah diambil, dan alasannya

**ISR dimatikan.** Tiga rute karier dulu memakai `revalidate = 60`. Di
Workers, ISR menuntut bucket R2 untuk incremental cache plus Durable Object
sebagai antrean revalidasi — dan Durable Object butuh plan berbayar.
Ketiganya sekarang `dynamic = "force-dynamic"`, yang berjalan tanpa binding
apa pun. Untuk career page satu perusahaan, selisih kecepatannya tidak
sepadan dengan biaya dan kerumitannya.

Kalau nanti trafiknya naik dan ISR jadi menarik, aktifkan `r2IncrementalCache`
di [`open-next.config.ts`](./open-next.config.ts) dan tambahkan binding R2 di
[`wrangler.jsonc`](./wrangler.jsonc) — keduanya sudah disiapkan dalam bentuk
komentar.

**Optimasi gambar dimatikan** (`images.unoptimized`). Optimasi bawaan Next.js
memerlukan `sharp`, yang tidak bisa berjalan di Workers; di sana optimasi
hanya tersedia lewat Cloudflare Images yang berbayar. Aplikasi ini cuma
memakai `next/image` untuk dua logo statis kecil, jadi tidak ada yang hilang.
Binding `IMAGES` tetap dibiarkan di `wrangler.jsonc` supaya mudah diaktifkan
kalau suatu saat dibutuhkan.

**Rate limit pindah ke Postgres.** Versi lama memakai `Map` di memori proses.
Itu hanya bekerja kalau aplikasi berjalan sebagai satu instance berumur
panjang; di Workers setiap isolate punya memorinya sendiri dan berumur
pendek, sehingga batasnya praktis hilang.

---

## Yang masih perlu diperhatikan

- **Konvensi `middleware` sudah deprecated** di Next.js 16 dan akan diganti
  `proxy`. Build masih jalan, hanya memunculkan peringatan. Codemod resmi:
  `npx @next/codemod@canary middleware-to-proxy .`
- **Node Middleware (fitur Next 15.2)** tidak didukung Workers. Aplikasi ini
  tidak memakainya — `src/middleware.ts` berjalan di runtime default.
- **Email masih belum dikonfigurasi.** Undangan anggota tim mengandalkan
  orangnya mendaftar sendiri lebih dulu. Untuk email sungguhan perlu SMTP
  (mis. Resend) yang di README ditandai sebagai Fase 2.

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

| Secret        | Nilai                                           |
| ------------- | ----------------------------------------------- |
| `APP_URL`     | `https://hireflow.<subdomain-anda>.workers.dev` |
| `CRON_SECRET` | sama dengan yang di `.env.local`                |

---

## Google Drive untuk penyimpanan CV (opsional)

Kalau keempat variabel di bawah tidak diisi, aplikasi memakai Supabase
Storage seperti biasa. Integrasi ini murni tambahan — tidak ada yang rusak
kalau dilewati.

### Kenapa OAuth, bukan service account

Service account **tidak punya kuota penyimpanan Drive sama sekali** dan tidak
bisa memiliki berkas. Alternatif resminya adalah Shared Drive, dan itu hanya
tersedia di Google Workspace berbayar. Untuk akun Gmail biasa, satu-satunya
jalan adalah OAuth atas nama akun manusia.

### 1. Siapkan proyek Google Cloud

1. Buka [console.cloud.google.com](https://console.cloud.google.com) → buat proyek baru
2. **APIs & Services → Library** → cari **Google Drive API** → **Enable**
3. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Isi nama aplikasi dan email dukungan
   - Scope: tambahkan `https://www.googleapis.com/auth/drive.file`
   - **Tekan Publish app** sampai statusnya **In production**

Langkah terakhir itu tidak boleh dilewat. Selama statusnya masih **Testing**,
Google mencabut refresh token setelah **7 hari** — unggahan CV akan mati tiap
minggu sampai Anda login ulang manual.

`drive.file` adalah scope tersempit: aplikasi hanya bisa menyentuh berkas yang
dibuatnya sendiri, tidak bisa membaca isi Drive Anda yang lain.

### 2. Buat OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Application type: **Web application**
- Authorized redirect URI: `http://localhost:8977/callback`

URI itu hanya dipakai sekali saat mengambil refresh token di komputer Anda.
Aplikasi yang berjalan di Cloudflare tidak pernah memakainya.

Catat **Client ID** dan **Client secret**.

### 3. Siapkan folder Drive

Buat folder di Google Drive, misalnya "Lamaran Kerja". Bagikan ke tim HR
seperti folder biasa — inilah yang membuat mereka bisa menelusuri CV tanpa
membuka aplikasi.

Ambil ID folder dari bilah alamat:

```
https://drive.google.com/drive/folders/1A2B3C4D5E6F7G8H9I
                                        └─────── ini ID-nya ───────┘
```

### 4. Ambil refresh token

```bash
node scripts/google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
```

Skrip membuka server lokal, mencetak tautan otorisasi, dan setelah Anda
menyetujui akan mencetak refresh token di terminal.

### 5. Pasang sebagai secret Worker

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put GOOGLE_DRIVE_FOLDER_ID
```

Keempatnya secret **runtime** — tidak dibutuhkan saat build.

### Cara kerjanya setelah aktif

```
Pelamar kirim lamaran
   │
   ├─ berhasil ─> Google Drive
   │               folder "Lamaran Kerja / {Judul Lowongan}"
   │               berkas "{Nama Pelamar}.pdf"
   │
   └─ gagal ────> Supabase Storage (jaring pengaman)
                   lamaran TETAP tersimpan
```

Kegagalan Drive tidak pernah membatalkan lamaran. Penyebabnya dicatat di log
Worker, CV-nya jatuh ke Supabase, dan pelamar tidak melihat error apa pun.
Kehilangan seorang pelamar lebih mahal daripada satu CV yang telat masuk
Drive.

Recruiter tetap mengunduh lewat tombol yang sama di aplikasi. Berkas Drive
disalurkan melalui Worker (`/api/resume/{id}`) karena Drive tidak punya
padanan signed URL berumur pendek — kendali aksesnya tetap milik aplikasi,
bukan tautan Drive yang bisa diteruskan siapa saja.

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

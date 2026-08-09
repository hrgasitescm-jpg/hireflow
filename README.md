# HireFlow

ATS (Applicant Tracking System) multi-tenant di atas **Next.js 16 + Supabase**, dirancang untuk berjalan di free tier.

Panduan tampilan ada di [DESIGN.md](./DESIGN.md).

Apa yang sudah jalan (Fase 0 + Fase 1):

- Daftar/masuk, buat organisasi, multi-organisasi per user
- Isolasi data antar-organisasi dengan Row Level Security — **diuji otomatis**
- CRUD lowongan, status draf/terbit/tutup, pipeline stage otomatis
- Career page publik + SEO `JobPosting` (syarat Google Jobs)
- Form lamaran publik: upload CV, honeypot anti-bot, rate limit, consent UU PDP
- Pipeline kanban drag-and-drop dengan optimistic update
- Profil kandidat, riwayat lamaran, catatan tim, audit log
- Portal status lamaran untuk kandidat (tanpa registrasi)
- Design system sendiri: netral hangat + aksen emas HireFlow, Inter di-host lokal

---

## 1. Persiapan (sekali saja, ±15 menit)

### 1.1 Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New project**
2. Isi nama project, buat **Database Password** (simpan baik-baik)
3. **Region: Southeast Asia (Singapore)** — paling dekat dari Indonesia
4. Tunggu provisioning selesai (±2 menit)

### 1.2 Jalankan migrasi

Buka **SQL Editor** di dashboard Supabase, lalu jalankan isi file berikut **berurutan**, satu per satu:

1. `supabase/migrations/0001_init.sql` — tabel, index, trigger
2. `supabase/migrations/0002_rls.sql` — Row Level Security
3. `supabase/migrations/0003_rpc_and_storage.sql` — RPC + bucket penyimpanan

> Kalau muncul `NOTICE: ... does not exist, skipping`, itu normal — migrasi ditulis supaya aman dijalankan ulang.

### 1.3 Matikan konfirmasi email (untuk development)

**Authentication → Sign In / Providers → Email** → matikan **Confirm email**.
Supabase Free hanya mengirim ±2 email per jam, jadi konfirmasi email akan menghambat saat testing. Nyalakan lagi sebelum produksi (dan pasang SMTP sendiri).

### 1.4 Isi environment variable

```bash
cp .env.example .env.local
```

Ambil nilainya di **Project Settings → API**:

| Variabel | Dari mana |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key — **rahasia**, jangan di-commit |
| `CRON_SECRET` | bebas; buat dengan perintah di bawah |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1.5 Jalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000> → Daftar → Buat organisasi → Buat lowongan → Terbitkan → buka career page-nya.

---

## 2. Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build produksi |
| `npm run typecheck` | Cek TypeScript tanpa build |
| `bash supabase/tests/run.sh` | **Test isolasi multi-tenant** (butuh PostgreSQL 16 lokal) |

Test isolasi menjalankan seluruh migrasi di PostgreSQL sementara lalu memverifikasi 26 hal, antara lain:

- Anggota Organisasi A tidak bisa membaca job/kandidat/lamaran Organisasi B
- Anggota Organisasi B tidak bisa menyisipkan atau mengubah data Organisasi A
- Peran `viewer` bisa membaca tapi tidak bisa menulis
- Kandidat dari organisasi lain tidak bisa dipasang ke lowongan (dijaga trigger)
- Audit log tidak bisa dipalsukan atau dihapus lewat API

Jalankan ini setiap kali kamu mengubah policy RLS. Kalau gagal, jangan deploy.

---

## 3. Struktur project

```
src/
├─ app/
│  ├─ (auth)/            login, register, action auth
│  ├─ (app)/[orgSlug]/   dashboard, jobs, candidates, settings  (butuh login)
│  ├─ karier/[orgSlug]/  career page publik + form lamaran
│  ├─ status/[token]/    portal status untuk pelamar
│  ├─ onboarding/        buat organisasi pertama
│  └─ api/               endpoint detail kandidat & cron
├─ components/
│  ├─ ui/index.tsx       komponen dasar (Button, Card, Field, Badge, …)
│  └─ logo.tsx           logo HireFlow, SVG inline (lockup & mark)
├─ lib/
│  ├─ supabase/          client (browser), server (RLS), admin (service role)
│  ├─ auth.ts            helper sesi & membership
│  ├─ validation.ts      semua skema Zod
│  ├─ public-data.ts     query khusus halaman publik
│  └─ database.types.ts  tipe hasil generate dari skema
└─ middleware.ts         refresh sesi + proteksi route

supabase/
├─ migrations/           SQL yang dijalankan di Supabase
└─ tests/                test isolasi multi-tenant
```

### Tiga client Supabase, kapan pakai yang mana

| Client | Dipakai di | RLS |
|---|---|---|
| `lib/supabase/server.ts` | Server Component, Server Action | **Aktif** — ini default |
| `lib/supabase/client.ts` | Komponen browser | **Aktif** |
| `lib/supabase/admin.ts` | Career page publik, submit lamaran | **Dilewati** — hati-hati |

Aturannya: kalau permintaan datang dari user yang login, pakai `server.ts`. `admin.ts` hanya untuk pembaca anonim, dan setiap query di dalamnya harus memfilter sendiri (`status = 'published'`, dan seterusnya).

---

## 4. Deploy

### ⚠️ Baca ini dulu soal Vercel

Vercel **Hobby plan melarang penggunaan komersial** — [dokumentasi resminya](https://vercel.com/docs/plans/hobby) menyebut Hobby dibatasi untuk *"non-commercial, personal use only"*. Kalau aplikasi ini dipakai perusahaan lain, akunmu berisiko disuspend.

- **Demo pribadi / belajar** → Vercel Hobby aman
- **Dipakai orang lain** → Cloudflare Workers (via OpenNext) atau Netlify

### Cloudflare Workers

```bash
npm i -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy
```

Set semua variabel dari `.env.local` sebagai secret Wrangler. Catatan: batas CPU 10 ms per invocation di free tier — cukup untuk render halaman, tidak cukup untuk parsing PDF atau panggilan AI. Pekerjaan berat itu nanti masuk ke antrean (Fase 3).

### Setelah deploy

1. Isi secrets `APP_URL` dan `CRON_SECRET` di GitHub → workflow keepalive aktif
2. **Authentication → URL Configuration** di Supabase: tambahkan domain produksimu ke Site URL dan Redirect URLs
3. Nyalakan lagi konfirmasi email dan pasang SMTP sendiri

---

## 5. Yang belum ada (dan disengaja)

Ini penutup Fase 1. Berikut yang sengaja ditunda, beserta alasannya.

| Belum ada | Kenapa ditunda | Fase |
|---|---|---|
| Undangan anggota lewat email | Butuh provider email; sementara tambah anggota lewat SQL editor | 2 |
| Email otomatis ke kandidat | Batas Resend 100/hari perlu antrean dulu, bukan kirim langsung | 2 |
| Scorecard interview | Butuh model peran interviewer yang lengkap | 2 |
| Parsing CV & AI scoring | Butuh `job_queue` + worker; jangan jalan inline di request | 3 |
| Interview scheduling | Butuh integrasi kalender | 4 |
| Analytics funnel | Butuh data nyata dulu supaya angkanya berarti | 5 |

Roadmap lengkap ada di dokumen spesifikasi terpisah.

### Utang teknis yang perlu dibereskan sebelum produksi

1. **Rate limit lamaran masih berbasis memori** (`src/app/karier/[orgSlug]/[jobSlug]/actions.ts`). Efektif hanya untuk satu instance. Di serverless multi-instance, ganti dengan Upstash Redis atau tabel Postgres.
2. **Belum ada CAPTCHA.** Honeypot menangkal bot sederhana saja. Tambahkan Cloudflare Turnstile (gratis) sebelum career page dibagikan luas.
3. **Backup.** Supabase Free tidak punya point-in-time recovery. Jadwalkan `pg_dump` ke Cloudflare R2 lewat GitHub Actions.
4. **Belum ada error tracking.** Pasang Sentry (5.000 event/bulan gratis) — tanpa ini, bug produksi tidak terlihat.

### Catatan font

Inter di-host sendiri dari `src/app/fonts/` memakai `next/font/local`, bukan `next/font/google`. Alasannya: build yang menarik font dari `fonts.googleapis.com` akan gagal saat offline atau di CI tertutup. Berkas woff2 berasal dari paket `@fontsource-variable/inter` (lisensi SIL OFL 1.1) dan sudah disalin ke repo, jadi tidak ada dependensi tambahan.

---

## 6. Catatan UU PDP

Form lamaran sudah memuat checkbox persetujuan eksplisit (tidak tercentang default) dan menyimpan `consent_at` + versi teks persetujuan di tabel `candidates`. Yang masih perlu kamu siapkan sendiri:

- Halaman kebijakan privasi
- Alur permintaan penghapusan data (kolom `anonymized_at` sudah tersedia)
- Kebijakan retensi otomatis

Form default sengaja **tidak** meminta NIK, foto, agama, atau status pernikahan. Kalau kamu menambahkannya lewat custom question, itu tergolong data pribadi spesifik dan syarat pemrosesannya lebih ketat.

Ini catatan teknis, bukan nasihat hukum.

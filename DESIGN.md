# Design system HireFlow

Panduan supaya tampilan tetap konsisten saat kamu menambah halaman baru.

## Prinsip

1. **Netral dulu, emas belakangan — tapi emas harus terlihat.** Emas merek
   (`#F5C518`) kontrasnya hanya ~1.7:1 di atas putih, jadi tidak pernah jadi
   teks di atas latar terang. Tapi emas di atas ink mencapai ~10:1: itulah
   sebabnya mark logo, tombol `gold`, dan ikon nav aktif boleh memakainya
   dengan penuh. Aksi utama tetap ink.
2. **Kontras adalah alat utama, bukan garis.** Hierarki dibangun dari
   perbedaan ukuran dan bobot yang cukup lebar untuk terbaca sekilas —
   34px display sampai 11px label. Kalau dua elemen terasa setara padahal
   kepentingannya berbeda, perbaiki ukurannya sebelum menambah garis.
3. **Elevasi tipis itu boleh.** Kartu memakai `shadow-xs` supaya terpisah
   dari kanvas. Yang benar-benar melayang — menu, drawer, kartu yang di-drag
   — memakai `shadow-lg` ke atas. Antara keduanya tidak ada.
4. **Ruang kosong itu fitur.** Lebih baik menambah jarak daripada menambah
   garis, kotak, atau warna.
5. **Satu sorotan emas per layar.** `Stat` punya prop `accent`; pakai untuk
   satu angka saja. Kalau ada dua hal beremas dalam satu pandangan di luar
   logo, salah satunya kemungkinan tidak perlu.

## Token warna

Semua di `src/app/globals.css` blok `@theme`.

| Token | Nilai | Kontras di atas putih | Dipakai untuk |
|---|---|---|---|
| `ink` | `#12100f` | 17.9:1 | Judul, angka, teks utama, tombol primer |
| `ink-soft` | `#33302d` | 11.6:1 | Isi paragraf, label |
| `muted` | `#5f5955` | 6.4:1 | Keterangan, metadata |
| `subtle` | `#8a827d` | 4.6:1 | Stempel waktu, teks paling tenang |
| `line` | `#e4e1de` | — | Border dan pemisah |
| `line-strong` | `#d3cfcb` | — | Pemisah yang perlu terbaca |
| `line-soft` | `#f4f3f1` | — | Latar hover, chip, isian tenang |
| `canvas` | `#f7f6f4` | — | Latar aplikasi |
| `surface` | `#ffffff` | — | Kartu, sidebar, panel |
| `gold-400` | `#f5c518` | 1.7:1 | Warna inti merek — **tidak pernah jadi teks di atas putih** |
| `gold-700` | `#96650f` | 4.6:1 | Satu-satunya emas yang aman untuk teks di atas putih |

Netralnya sengaja **hangat** (keluarga `stone`), bukan abu kebiruan. Abu biru
membuat emas terlihat kotor. Bayangan pun berona ink dengan alasan yang sama.

## Tipografi

Inter, di-host sendiri di `src/app/fonts/` lewat `next/font/local` — build
tidak boleh bergantung pada koneksi ke Google.

Semua ukuran berasal dari token. **Jangan tulis `text-[13.5px]`** — kalau
ukuran yang kamu butuh tidak ada di sini, kemungkinan besar salah satu dari
yang ada sudah cukup.

| Kelas | Ukuran | Bobot | Untuk |
|---|---|---|---|
| `text-display` | 34px | 700 | Hero career page, judul auth |
| `text-title` | 26px | 600 | Judul halaman |
| `text-heading` | 17px | 600 | Judul kartu dan bagian |
| `text-body` | 14px | 400 | Isi |
| `text-small` | 13px | 400 | Daftar padat, isi sekunder |
| `text-caption` | 12px | 400 | Keterangan, metadata |
| `text-label` | 11px | 600 | Label huruf besar, tracking 0.08em |

Angka dalam tabel dan statistik pakai kelas `.tabular`.

## Radius

Dua nilai saja: `rounded-control` (8px) untuk tombol, input, dan chip;
`rounded-surface` (14px) untuk kartu dan panel. Keduanya token tema — jangan
pakai `rounded-md`, `rounded-2xl`, dan sejenisnya supaya tidak muncul nilai
ketiga.

## Komponen

Semua di `src/components/ui/index.tsx`:

`Button` / `ButtonLink` / `buttonClass` · `Input` `Textarea` `Select`
`Checkbox` `Field` · `Card` `Section` `CardHeader` · `Badge` `Dot` `Avatar` ·
`Alert` `EmptyState` `PageHeader` `Stat`

- Varian tombol: `primary` (ink), `secondary` (putih + garis), `ghost`,
  `gold`, `danger`. Tinggi: `sm` 32px, `md` 40px, `lg` 48px.
- Tone badge: `neutral`, `gold`, `green`, `amber`, `red`.
- `Avatar` mewarnai dirinya dari nama supaya daftar panjang punya pijakan
  mata. Pakai `muted` untuk avatar organisasi di sidebar.
- `PageHeader` punya slot `eyebrow` untuk hitungan ringkas seperti
  "12 lowongan · 5 terbit".

## Logo

`src/components/logo.tsx` — SVG inline, bukan berkas gambar.

- `<Logo size="sm|md|lg|xl" tone="light|invert" />` — mark + wordmark.
- `<LogoMark size={32} tone="light|invert" />` — mark saja.

Marknya adalah corong menyempit: funnel rekrutmen. `tone="invert"` menukar
kotak jadi emas dan batang jadi ink, untuk dipakai di atas panel gelap.

Ukuran diatur lewat prop `size`, **bukan** kelas tinggi seperti `h-6` —
wordmark adalah teks, dan tinggi elemen tidak bisa menggerakkan ukuran font.

## Aset ikon

| Berkas | Untuk | Dibuat dari |
|---|---|---|
| `src/app/icon.svg` | Favicon (konvensi Next.js) | ditulis tangan |
| `src/app/apple-icon.png` | 180×180, layar utama iOS | dirender dari `icon.svg` |
| `public/icon-512.png` | PWA / berbagi | dirender dari `icon.svg` |
| `public/icon-192.png` | PWA | dirender dari `icon.svg` |

PNG dirender ulang dari SVG dengan `sharp` supaya tidak pernah menyimpang
dari logo di aplikasi. Metadata tidak mendaftarkan ikon secara manual —
Next.js membacanya dari konvensi berkas.

## Aksesibilitas

- Cincin fokus emas 2px dengan offset 2px, konsisten di seluruh aplikasi.
- Rasio kontras mengikuti tabel token di atas; `subtle` adalah batas bawah
  dan hanya untuk teks yang boleh terlewat.
- Emas tidak pernah jadi satu-satunya penanda status — selalu ada teks atau
  ikon pendamping.
- `prefers-reduced-motion` dihormati secara global.

## Saat menambah halaman baru

1. Bungkus dengan `<PageHeader eyebrow title description action />`.
2. Kelompokkan konten dalam `<Card>`, pisahkan dengan `divide-y divide-line`.
   Untuk kartu berisi daftar mepet tepi, pakai `<CardHeader>` alih-alih
   `<Section>`.
3. Daftar kosong memakai `<EmptyState>`, jangan halaman putih polos.
4. Ambil ukuran teks dari token `text-*` di atas.
5. Sebelum menambah warna baru, cek dulu: apakah `ink`, `muted`, atau `line`
   sudah cukup?

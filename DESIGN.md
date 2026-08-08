# Design system CKB

Panduan singkat supaya tampilan tetap konsisten saat kamu menambah halaman baru.

## Prinsip

1. **Netral dulu, emas belakangan.** Emas logo (`#F5C518`) kontrasnya hanya ~1.7:1 di atas putih — tidak layak untuk teks maupun tombol. Aksi utama memakai *ink* (nyaris hitam). Emas dipakai untuk logo, penanda aktif, cincin fokus, dan sorotan kecil.
2. **Garis rambut, bukan bayangan.** Pemisah visual memakai border 1px `--color-line`. Bayangan hanya untuk elemen yang benar-benar melayang: dropdown, drawer, kartu yang sedang di-drag.
3. **Ruang kosong itu fitur.** Lebih baik menambah jarak daripada menambah garis, kotak, atau warna.
4. **Satu aksen per layar.** Kalau ada dua hal berwarna emas dalam satu pandangan, salah satunya kemungkinan besar tidak perlu.

## Token warna

Semua didefinisikan di `src/app/globals.css` blok `@theme`.

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `ink` | `#1c1917` | Teks utama, tombol primer, panel gelap |
| `ink-soft` | `#44403c` | Teks isi, label |
| `muted` | `#78716c` | Teks pendukung, keterangan |
| `line` | `#e7e5e4` | Border dan pemisah |
| `line-soft` | `#f5f5f4` | Latar hover, chip, isian tenang |
| `canvas` | `#fafaf9` | Latar aplikasi |
| `gold-400` | `#f5c518` | Warna inti logo — aksen, bukan teks |
| `gold-700` | `#96650f` | Satu-satunya emas yang aman untuk teks di atas putih |

Netralnya sengaja **hangat** (keluarga `stone`), bukan abu kebiruan (`slate`). Abu biru membuat emas terlihat kotor.

## Tipografi

Inter, di-host sendiri di `src/app/fonts/` (bukan lewat `next/font/google`, supaya build tidak butuh koneksi ke Google).

| Peran | Ukuran | Bobot |
|---|---|---|
| Judul halaman | 22px | 600 |
| Judul career page | 32–38px | 600 |
| Judul bagian | 14–15px | 600 |
| Isi | 13.5–15px | 400 |
| Keterangan | 11–12.5px | 400–500 |
| Label huruf besar | 11px, tracking 0.08–0.16em | 500 |

Judul memakai `letter-spacing: -0.021em` (diatur global). Angka dalam tabel dan statistik pakai kelas `.tabular`.

## Radius

Dua nilai saja: `rounded-control` (8px) untuk tombol, input, dan chip; `rounded-surface` (12px) untuk kartu dan panel. Keduanya token tema — jangan pakai `rounded-md`, `rounded-2xl`, dan sejenisnya supaya tidak muncul nilai ketiga.

## Komponen

Semua ada di `src/components/ui/index.tsx`:

`Button` / `ButtonLink` / `buttonClass` · `Input` `Textarea` `Select` `Checkbox` `Field` · `Card` `Section` · `Badge` `Dot` `Avatar` · `Alert` `EmptyState` `PageHeader` `Stat`

Varian tombol: `primary` (ink), `secondary` (putih + garis), `ghost`, `gold`, `danger`.
Tone badge: `neutral`, `gold`, `green`, `amber`, `red`.

Logo ada di `src/components/logo.tsx` — `<Logo variant="lockup" />` untuk header, `<Logo variant="mark" />` untuk ikon saja.

## Aset logo

| Berkas | Ukuran | Untuk |
|---|---|---|
| `public/logo-ckb.png` | 576×162 | Lockup penuh: sidebar, halaman auth, footer |
| `public/mark-ckb.png` | 228×162 | Ikon saja |
| `public/icon-32.png` | 32×32 | Favicon |
| `public/icon-180.png` | 180×180 | Ikon layar utama iOS |
| `public/icon-512.png` | 512×512 | PWA / berbagi |
| `src/app/icon.png` | 32×32 | Favicon otomatis Next.js |

Semuanya dipotong rapat dari logo asli dan berlatar transparan, jadi aman di atas putih maupun `ink`.

## Aksesibilitas

- Cincin fokus emas 2px dengan offset 2px, konsisten di seluruh aplikasi.
- Rasio kontras: teks isi ≥ 7:1, teks pendukung ≥ 4.6:1, teks emas hanya `gold-700` ke atas.
- Emas tidak pernah jadi satu-satunya penanda status — selalu ada teks atau ikon pendamping.
- `prefers-reduced-motion` dihormati secara global.

## Saat menambah halaman baru

1. Bungkus dengan `<PageHeader title description action />`.
2. Kelompokkan konten dalam `<Card>`, pisahkan dengan `divide-y divide-line`.
3. Daftar kosong memakai `<EmptyState>`, jangan halaman putih polos.
4. Sebelum menambah warna baru, cek dulu: apakah `ink`, `muted`, atau `line` sudah cukup?

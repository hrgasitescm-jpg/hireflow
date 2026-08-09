import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  TrendingUp,
  Sprout,
  FileText,
  Clock,
  Lock,
  Rocket,
} from "lucide-react";
import { getPublicJobs, getPublicOrg } from "@/lib/public-data";
import { buttonClass } from "@/components/ui";
import { RichContent } from "@/components/rich-content";
import {
  EMPLOYMENT_TYPE_LABEL,
  workModeLabel,
  formatSalaryRange,
} from "@/lib/utils";

/**
 * Dirender per permintaan, bukan ISR.
 *
 * ISR di Cloudflare Workers menuntut binding tambahan — R2 untuk incremental
 * cache dan Durable Object sebagai antrean revalidasi — sementara SSR jalan
 * tanpa konfigurasi apa pun. Untuk career page satu perusahaan yang trafiknya
 * kecil, selisih kecepatannya tidak sepadan dengan biaya dan kerumitannya.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) return { title: "Tidak ditemukan" };

  return {
    title: { absolute: `Karier di ${org.name.trim()}` },
    description:
      org.about ?? `Lowongan kerja yang sedang dibuka di ${org.name}.`,
    openGraph: {
      title: { absolute: `Karier di ${org.name.trim()}` },
      description: org.about ?? undefined,
      type: "website",
    },
  };
}

/**
 * Nilai perusahaan dan keunggulan layanan.
 *
 * Teksnya diambil dari poster supaya keduanya selaras. Kalau poster diganti
 * dan isinya berubah, daftar ini ikut diperbarui — kalau tidak, pengunjung
 * desktop dan pengunjung ponsel akan membaca janji yang berbeda.
 */
const VALUES = [
  {
    icon: ShieldCheck,
    title: "Keselamatan Utama",
    body: "Tidak ada target yang lebih penting daripada pulangnya setiap orang dengan selamat.",
  },
  {
    icon: Users,
    title: "Kerja Sama Profesional",
    body: "Pekerjaan lapangan hanya berjalan kalau setiap peran saling menopang.",
  },
  {
    icon: TrendingUp,
    title: "Integritas & Inovasi",
    body: "Jujur pada hasil, dan terbuka pada cara kerja yang lebih baik.",
  },
  {
    icon: Sprout,
    title: "Peduli & Bertanggung Jawab",
    body: "Pada lingkungan tempat kami bekerja dan masyarakat di sekitarnya.",
  },
] as const;

const BENEFITS = [
  {
    icon: FileText,
    title: "Proses Mudah",
    body: "Lamar kapan saja dan di mana saja, cukup lewat halaman ini.",
  },
  {
    icon: Clock,
    title: "Informasi Transparan",
    body: "Rincian posisi disampaikan lengkap sejak awal.",
  },
  {
    icon: Lock,
    title: "Keamanan Data Terjamin",
    body: "Data pribadi kamu diproses sesuai UU Pelindungan Data Pribadi.",
  },
  {
    icon: Rocket,
    title: "Peluang Tanpa Batas",
    body: "Berkembang bersama perusahaan yang terus bertumbuh.",
  },
] as const;

export default async function CareerPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) notFound();

  const jobs = await getPublicJobs(org.id);
  const orgName = org.name.trim();

  return (
    <>
      {/* ------------------------------------------------------------------
          Hero penuh lebar.

          Keluar dari wadah max-w-5xl supaya membentang dari tepi ke tepi.
          Poster yang duduk di dalam kotak bergaris terbaca sebagai gambar yang
          ditempel ke halaman; tanpa kotak ia terbaca sebagai bagian situs.

          Tetap hanya dari 640px ke atas. Seluruh teks di poster adalah piksel:
          mesin pencari tidak bisa membacanya, dan pada lebar ponsel hurufnya
          menyusut jadi sekitar 5px. Isinya kini juga hadir sebagai bagian HTML
          di bawah, sehingga pengunjung ponsel tidak kehilangan apa pun.
          ------------------------------------------------------------------ */}
      <div className="hidden border-b border-line sm:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/poster-karier.webp"
          srcSet="/poster-karier-sm.webp 900w, /poster-karier.webp 1717w"
          sizes="100vw"
          width={1717}
          height={916}
          alt={`Bergabunglah bersama ${orgName} — bangun masa depan bersama.`}
          className="block h-auto w-full"
        />
      </div>

    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
      {/* Hero teks — hanya di layar kecil, tempat poster tidak terbaca */}
      <div className="sm:hidden">
        <p className="text-label uppercase tracking-[0.16em] text-gold-700">
          Karier
        </p>
        <h1 className="mt-4 text-display text-ink">Bergabunglah bersama kami</h1>
        <p className="mt-4 text-body font-semibold text-ink-soft">{orgName}</p>
      </div>

      {/* Deskripsi perusahaan dan tautan situs, di bawah hero mana pun yang
          sedang tampil. */}
      {(org.about || org.website) && (
        /* Tombol diturunkan ke bawah paragraf, bukan disandingkan di kanannya.
           Sebelumnya ia sejajar dengan baris pertama teks, menghasilkan baris
           yang berat sebelah dan paragraf yang terpotong lebarnya tanpa alasan.

           Warna teks dinaikkan dari muted ke ink-soft: ini paragraf utama
           yang dibaca pelamar, bukan keterangan sampingan. */
        <section className="mt-14">
          <h2 className="text-title text-ink">Tentang perusahaan</h2>
          <div className="mt-5 max-w-3xl">
          {org.about && (
            <RichContent
              value={org.about}
              className="text-[1.0625rem] leading-relaxed text-ink-soft"
            />
          )}
          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({
                variant: "secondary",
                className: org.about ? "mt-6" : "",
              })}
            >
              Situs perusahaan
            </a>
          )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------
          Nilai perusahaan

          Isi ini ada di dalam poster, tapi di sana ia berupa piksel: tidak
          terbaca mesin pencari, tidak terbaca pembaca layar, dan sama sekali
          tidak tampil di ponsel karena posternya disembunyikan di bawah 640px.

          Dibangun ulang sebagai HTML supaya semua pengunjung melihatnya, dan
          supaya halaman ini punya isi — bukan sekadar gambar lalu satu daftar.
          ------------------------------------------------------------------ */}
      <section className="mt-16">
        <h2 className="text-title text-ink">Kenapa bergabung dengan kami</h2>
        <p className="mt-2 max-w-2xl text-body text-muted">
          Empat hal yang kami pegang dalam bekerja, di lapangan maupun di
          kantor.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-surface border border-line bg-surface p-5 shadow-xs"
            >
              <span className="flex size-11 items-center justify-center rounded-surface bg-gold-50 text-gold-700 ring-1 ring-inset ring-gold-200">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-body font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-small leading-relaxed text-muted">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          Keunggulan melamar lewat halaman ini

          Sengaja dibuat pita ringkas, bukan kartu besar seperti nilai
          perusahaan. Isinya menenangkan pelamar soal proses dan keamanan data
          — penting karena form ini meminta CV dan nomor pribadi — tapi ia
          bukan alasan utama orang melamar, jadi tidak pantas memakai ruang
          sebanyak itu.
          ------------------------------------------------------------------ */}
      {/* Jarak lebih rapat dari antarbagian (mt-6, bukan mt-16) karena pita
          ini kelanjutan dari bagian nilai di atasnya, bukan bagian baru.
          Jarak yang sama akan membuatnya terbaca sebagai bagian terpisah tanpa
          judul — persis kekeliruan yang tadi terjadi pada paragraf perusahaan. */}
      <section className="mt-6 rounded-surface bg-line-soft/70 px-6 py-7 ring-1 ring-inset ring-line">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <Icon
                className="mt-0.5 size-[1.125rem] shrink-0 text-gold-600"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-small font-semibold text-ink">{title}</p>
                <p className="mt-1 text-caption leading-relaxed text-muted">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Daftar posisi */}
      <div className="mt-16 min-w-0">
        <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="text-title text-ink">Posisi terbuka</h2>
            <p className="mt-1.5 text-small text-muted">
              {jobs.length > 0
                ? "Klik posisi untuk melihat rincian dan mengirim lamaran."
                : "Belum ada posisi yang sedang dibuka."}
            </p>
          </div>
          <span className="tabular shrink-0 rounded-full bg-line-soft px-3 py-1 text-body font-semibold text-ink ring-1 ring-inset ring-line">
            {jobs.length}
          </span>
        </div>

        {jobs.length === 0 ? (
          /* Keadaan kosong diberi wadah bergaris putus. Tanpa itu, halaman
             yang belum punya lowongan terbaca seperti halaman yang gagal
             memuat, bukan halaman yang memang sedang tidak ada isinya. */
          <div className="mt-6 rounded-surface border border-dashed border-line-strong bg-line-soft/40 px-6 py-16 text-center">
            <p className="text-heading text-ink">Belum ada posisi yang dibuka</p>
            <p className="mx-auto mt-2 max-w-xs text-small leading-relaxed text-muted">
              Cek kembali lain waktu, atau ikuti kanal resmi kami untuk
              pengumuman lowongan berikutnya.
            </p>
          </div>
        ) : (
        /* Setiap lowongan jadi kartu yang terangkat saat disentuh, bukan baris
           telanjang di antara garis. Ini halaman tempat orang memutuskan mau
           melamar atau tidak — tiap posisi pantas punya bentuknya sendiri. */
        <ul className="mt-6 space-y-3">
          {jobs.map((job) => {
            const department = job.departments as unknown as {
              name: string;
            } | null;
            const location = job.locations as unknown as {
              name: string;
            } | null;
            const salary = formatSalaryRange(
              job.salary_min,
              job.salary_max,
              job.salary_visible,
            );
            const meta = [
              department?.name,
              location?.name,
              workModeLabel(job.work_mode),
              EMPLOYMENT_TYPE_LABEL[job.employment_type],
            ].filter(Boolean);

            return (
              <li key={job.id}>
                <Link
                  href={`/karier/${org.slug}/${job.slug}`}
                  className="group flex items-center gap-6 rounded-surface border border-line bg-surface px-6 py-6 transition-[box-shadow,border-color,transform] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-title text-ink transition-colors group-hover:text-gold-700">
                      {job.title}
                    </h3>

                    {/* Metadata jadi keping terpisah, bukan satu baris dipisah
                        titik. Mata memindai daftar lowongan dengan mencari
                        lokasi dan tipe kerja — keduanya lebih cepat ditemukan
                        sebagai bentuk sendiri daripada di tengah kalimat. */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {meta.map((m) => (
                        <span
                          key={String(m)}
                          className="rounded-full bg-line-soft px-2.5 py-1 text-caption font-medium text-ink-soft ring-1 ring-inset ring-line"
                        >
                          {m}
                        </span>
                      ))}
                      {salary && (
                        <span className="rounded-full bg-gold-50 px-2.5 py-1 text-caption font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">
                          {salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Panah dalam lingkaran — pada kartu selebar ini, panah
                      telanjang terlihat seperti ornamen, bukan ajakan. */}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line-soft text-ink-soft transition-colors group-hover:bg-ink group-hover:text-white">
                    <ArrowRight className="size-4.5" aria-hidden />
                  </span>
                </Link>
              </li>
            );
            })}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------------
          Penutup

          Career page yang berakhir tepat setelah daftar lowongan terasa
          menggantung, terutama ketika lowongannya sedikit. Bagian ini memberi
          jalan bagi pengunjung yang tidak menemukan posisi cocok — tanpa
          menjanjikan apa pun yang belum bisa ditepati.
          ------------------------------------------------------------------ */}
      <section className="panel-ink mt-16 rounded-surface px-8 py-10 text-center">
        <h2 className="text-title text-white">
          Belum menemukan posisi yang cocok?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body leading-relaxed text-stone-400">
          Lowongan baru kami umumkan di halaman ini. Simpan alamatnya, atau
          ikuti kanal resmi {orgName} untuk kabar berikutnya.
        </p>
        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClass({ variant: "gold", className: "mt-7" })}
          >
            Kunjungi situs perusahaan
          </a>
        )}
      </section>
    </div>
    </>
  );
}

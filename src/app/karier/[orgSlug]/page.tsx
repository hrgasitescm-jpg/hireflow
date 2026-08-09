import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
    <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
      {/* ------------------------------------------------------------------
          Hero

          Poster menggantikan judul teks yang dulu ada di sini, bukan menumpuk
          di atasnya — isinya menyampaikan pesan yang sama (ajakan bergabung,
          nilai perusahaan) dengan jauh lebih kuat.

          Tapi seluruh teks di poster itu adalah piksel: pembaca layar tidak
          bisa membacanya, mesin pencari tidak bisa mengindeksnya, dan pada
          lebar ponsel hurufnya menyusut jadi sekitar 5px — tidak terbaca.
          Karena itu poster hanya tampil dari 640px ke atas, dan di bawah itu
          diganti judul teks sungguhan. Isi `alt` menanggung pesan poster untuk
          pembaca layar.
          ------------------------------------------------------------------ */}
      <div className="hidden overflow-hidden rounded-surface border border-line shadow-sm sm:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/poster-karier.webp"
          srcSet="/poster-karier-sm.webp 900w, /poster-karier.webp 1717w"
          sizes="(max-width: 1024px) 100vw, 1024px"
          width={1717}
          height={916}
          alt={`Bergabunglah bersama ${orgName} — bangun masa depan bersama. Nilai kami: keselamatan utama, kerja sama profesional, integritas dan inovasi, serta peduli dan bertanggung jawab.`}
          className="block h-auto w-full"
        />
      </div>

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
        <div className="mt-8 flex flex-wrap items-start justify-between gap-6">
          {org.about && (
            <RichContent
              value={org.about}
              className="max-w-2xl text-body leading-relaxed text-muted"
            />
          )}
          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonClass({ variant: "secondary" })}
            >
              Situs perusahaan
            </a>
          )}
        </div>
      )}

      {/* Daftar posisi */}
      <div className="mt-14 min-w-0">
        <div className="flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="text-heading text-ink">Posisi terbuka</h2>
          <span className="tabular rounded-full bg-line-soft px-2.5 py-0.5 text-caption font-semibold text-ink-soft ring-1 ring-inset ring-line">
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
                  className="group flex items-center gap-5 rounded-surface border border-line bg-surface px-6 py-5 transition-[box-shadow,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-heading text-ink transition-colors group-hover:text-gold-700">
                      {job.title}
                    </h3>
                    <p className="mt-2 text-small text-muted">
                      {meta.join("  ·  ")}
                    </p>
                    {salary && (
                      <p className="mt-3 inline-flex rounded-control bg-gold-50 px-2.5 py-1 text-caption font-semibold text-gold-800 ring-1 ring-inset ring-gold-200">
                        {salary}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    className="size-4.5 shrink-0 text-subtle transition-all group-hover:translate-x-0.5 group-hover:text-gold-600"
                    aria-hidden
                  />
                </Link>
              </li>
            );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

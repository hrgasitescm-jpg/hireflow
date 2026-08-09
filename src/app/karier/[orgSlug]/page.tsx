import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getPublicJobs, getPublicOrg } from "@/lib/public-data";
import { buttonClass } from "@/components/ui";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORK_MODE_LABEL,
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
    <div className="mx-auto grid max-w-5xl gap-x-16 gap-y-12 px-6 py-14 lg:grid-cols-[19rem_1fr] lg:py-20">
      {/* ------------------------------------------------------------------
          Kolom kiri — identitas perusahaan, menempel saat digulir.

          Judul besarnya sengaja kalimat pendek yang tetap, dan nama
          perusahaan diturunkan ke baris sendiri yang lebih kecil. Versi lama
          menyusun "Bergabung dengan {nama}" sebagai satu judul 34px, dan
          dengan nama berhuruf besar sepanjang "PT. CITRAMEGAH KARUNIA
          BERSAMA" hasilnya patah di tempat aneh dan terbaca seperti
          berteriak.
          ------------------------------------------------------------------ */}
      <aside className="lg:sticky lg:top-12 lg:self-start">
        <p className="text-label uppercase tracking-[0.16em] text-gold-700">
          Karier
        </p>
        <h1 className="mt-4 text-display text-ink">Bergabung dengan tim kami</h1>
        <p className="mt-4 text-body font-semibold text-ink-soft">{orgName}</p>

        {org.about ? (
          <p className="mt-6 text-body leading-relaxed whitespace-pre-wrap text-muted">
            {org.about}
          </p>
        ) : (
          <p className="mt-6 text-body leading-relaxed text-muted">
            Kami membuka kesempatan bagi orang-orang yang ingin tumbuh bersama.
            Lihat posisi yang tersedia di samping.
          </p>
        )}

        {org.website && (
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonClass({
              variant: "secondary",
              className: "mt-8",
            })}
          >
            Situs perusahaan
          </a>
        )}
      </aside>

      {/* Kolom kanan — daftar posisi */}
      <div className="min-w-0">
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
              WORK_MODE_LABEL[job.work_mode],
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

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { RichContent } from "@/components/rich-content";
import { parseStoredDoc, plainTextFromDoc } from "@/lib/rich-text";
import { CareerHeader } from "../career-header";
import {
  getPublicJob,
  getPublicOrg,
  getJobQuestions,
  getRemoteWorkModes,
} from "@/lib/public-data";
import { env } from "@/lib/env";
import {
  EMPLOYMENT_TYPE_LABEL,
  workModeLabel,
  formatSalaryRange,
} from "@/lib/utils";
import { ApplyForm } from "./apply-form";

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
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, jobSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) return { title: "Tidak ditemukan" };

  const job = await getPublicJob(org.id, jobSlug);
  if (!job) return { title: "Tidak ditemukan" };

  const description =
    plainTextFromDoc(parseStoredDoc(job.description)).slice(0, 160) ||
    `Lowongan di ${org.name}`;

  return {
    title: { absolute: `${job.title} — ${org.name.trim()}` },
    description,
    openGraph: { title: job.title, description, type: "article" },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}) {
  const { orgSlug, jobSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) notFound();

  const job = await getPublicJob(org.id, jobSlug);
  if (!job) notFound();

  const questions = await getJobQuestions(job.id);
  const remoteModes = await getRemoteWorkModes(org.id);
  const department = job.departments as unknown as { name: string } | null;
  const location = job.locations as unknown as {
    name: string;
    country: string;
  } | null;
  const salary = formatSalaryRange(
    job.salary_min,
    job.salary_max,
    job.salary_visible,
  );

  /* Ketiganya opsional saat membuat lowongan. Kalau semuanya kosong, seluruh
     bagian deskripsi tidak dirender sama sekali — bukan dirender kosong. */
  const hasContent = Boolean(
    job.description?.trim() ||
      job.requirements?.trim() ||
      job.benefits?.trim(),
  );

  // Structured data supaya lowongan bisa muncul di Google Jobs.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: [job.description, job.requirements, job.benefits]
      .filter(Boolean)
      .join("\n\n"),
    datePosted: job.published_at,
    validThrough: job.closes_at ?? undefined,
    employmentType:
      {
        full_time: "FULL_TIME",
        part_time: "PART_TIME",
        contract: "CONTRACTOR",
        internship: "INTERN",
        freelance: "CONTRACTOR",
      }[job.employment_type] ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: org.name,
      sameAs: org.website ?? undefined,
      logo: org.logo_url ?? undefined,
    },
    jobLocationType: remoteModes.has(job.work_mode) ? "TELECOMMUTE" : undefined,
    jobLocation: location
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: location.name,
            addressCountry: location.country,
          },
        }
      : undefined,
    baseSalary:
      job.salary_visible && job.salary_min
        ? {
            "@type": "MonetaryAmount",
            currency: job.salary_currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salary_min,
              maxValue: job.salary_max ?? job.salary_min,
              unitText: "MONTH",
            },
          }
        : undefined,
    url: `${env.siteUrl}/karier/${org.slug}/${job.slug}`,
  };

  return (
    /* Lebar luar disamakan dengan header dan footer di layout (max-w-5xl)
       supaya tepi kiri isinya sejajar dengan logo. Sebelumnya halaman ini
       max-w-2xl sementara headernya max-w-5xl, dan bedanya terlihat sebagai
       konten yang melenceng ke kanan.

       Teksnya sendiri tetap dibatasi max-w-3xl di dalam — baris deskripsi
       pekerjaan yang selebar 1024px melelahkan dibaca. */
    <>
      <CareerHeader org={org} />
      <article className="mx-auto max-w-5xl px-6 py-12 sm:py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <Link
          href={`/karier/${org.slug}`}
          className="inline-flex items-center gap-1.5 text-small font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Semua posisi
        </Link>

        <h1 className="mt-6 max-w-3xl text-display text-ink">{job.title}</h1>

        {/* ----------------------------------------------------------------
            Dua kolom.

            Versi sebelumnya menumpuk semuanya dalam satu kolom selebar 3xl di
            dalam wadah 5xl, sehingga separuh layar kanan menganga kosong.
            Ringkasan lowongan dipindahkan ke kolom kanan yang menempel saat
            digulir — itu mengisi ruang yang tadinya terbuang, dan membuat
            tombol lamar selalu terlihat, bukan hanya di bagian paling atas.
            ---------------------------------------------------------------- */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_19rem] lg:gap-14">
          <div className="min-w-0">
            {hasContent ? (
              <div className="space-y-11">
                {job.description && (
                  <Prose title="Deskripsi pekerjaan" content={job.description} />
                )}
                {job.requirements && (
                  <Prose title="Kualifikasi" content={job.requirements} />
                )}
                {job.benefits && <Prose title="Benefit" content={job.benefits} />}
              </div>
            ) : (
              /* Tanpa ini, kolom kiri kosong melompong dan tata letaknya
                 terlihat patah. Kalimatnya jujur: deskripsinya memang belum
                 ada, dan pelamar tetap dipersilakan mengirim lamaran. */
              <div className="rounded-surface border border-dashed border-line-strong bg-line-soft/40 px-6 py-10">
                <p className="text-heading text-ink">
                  Deskripsi lengkap belum tersedia
                </p>
                <p className="mt-2 max-w-md text-small leading-relaxed text-muted">
                  Rincian tugas dan kualifikasi posisi ini akan kami sampaikan
                  saat proses seleksi. Silakan kirim lamaran, tim kami akan
                  menghubungi kamu.
                </p>
              </div>
            )}
          </div>

          {/* Ringkasan yang menempel saat digulir */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-surface border border-line bg-surface p-5 shadow-xs">
              <dl>
                {department && (
                  <Meta label="Departemen" value={department.name} />
                )}
                {location && <Meta label="Lokasi" value={location.name} />}
                <Meta
                  label="Tipe"
                  value={EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? "-"}
                />
                <Meta label="Mode kerja" value={workModeLabel(job.work_mode)} />
                {salary && <Meta label="Gaji / bulan" value={salary} accent />}
                {job.openings > 1 && (
                  <Meta label="Slot tersedia" value={String(job.openings)} />
                )}
              </dl>

              <a
                href="#lamar"
                className={buttonClass({
                  size: "lg",
                  className: "mt-6 w-full",
                })}
              >
                Lamar posisi ini
              </a>
            </div>
          </aside>
        </div>

        <section
          id="lamar"
          className="mt-16 max-w-3xl scroll-mt-8 border-t border-line pt-10"
        >
          <h2 className="text-title text-ink">Lamar posisi ini</h2>
          <p className="mt-3 text-body text-muted">
            Isi data di bawah dan unggah CV kamu. Sekitar 2 menit.
          </p>

          <ApplyForm
            orgSlug={org.slug}
            jobSlug={job.slug}
            orgName={org.name}
            questions={questions}
          />
        </section>
      </article>
    </>
  );
}

function Meta({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  /* Tanpa kotak sendiri. Meta kini berada di dalam kartu ringkasan di kolom
     kanan, dan kotak di dalam kotak membuat sisi itu terlihat penuh. Yang
     accent tetap diberi warna karena gaji adalah angka yang dicari duluan. */
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="shrink-0 text-label uppercase text-muted">{label}</dt>
      <dd
        className={
          accent
            ? "text-right text-small font-semibold text-gold-800"
            : "text-right text-small font-medium text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Prose({ title, content }: { title: string; content: string }) {
  return (
    <section>
      <h2 className="text-heading text-ink">{title}</h2>
      <div className="mt-4 text-[1.0625rem] leading-[1.75] text-ink-soft">
        <RichContent value={content} />
      </div>
    </section>
  );
}

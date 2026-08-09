import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { getPublicJob, getPublicOrg, getJobQuestions } from "@/lib/public-data";
import { env } from "@/lib/env";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatSalaryRange,
} from "@/lib/utils";
import { ApplyForm } from "./apply-form";

export const revalidate = 60;

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

  const description = job.description.slice(0, 160) || `Lowongan di ${org.name}`;

  return {
    title: { absolute: `${job.title} — ${org.name.trim()}` },
    description,
    openGraph: { title: job.title, description, type: "article" },
  };
}

/** Blok teks sederhana: baris diawali "-" jadi bullet, sisanya paragraf. */
function RichText({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;

  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = (key: number) => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="my-3 space-y-2 pl-5 marker:text-gold-400">
        {bullets.map((b, i) => (
          <li key={i} className="list-disc">
            {b}
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, ""));
    } else {
      flush(i);
      blocks.push(
        <p key={`p-${i}`} className="my-3 first:mt-0">
          {trimmed}
        </p>,
      );
    }
  });
  flush(lines.length);

  return <>{blocks}</>;
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
    jobLocationType: job.work_mode === "remote" ? "TELECOMMUTE" : undefined,
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
    <article className="mx-auto max-w-2xl px-6 py-14 sm:py-16">
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

      <header className="mt-6 border-b border-line pb-8">
        <h1 className="text-display text-ink">
          {job.title}
        </h1>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {department && <Meta label="Departemen" value={department.name} />}
          {location && <Meta label="Lokasi" value={location.name} />}
          <Meta
            label="Tipe"
            value={EMPLOYMENT_TYPE_LABEL[job.employment_type] ?? "-"}
          />
          <Meta
            label="Mode kerja"
            value={WORK_MODE_LABEL[job.work_mode] ?? "-"}
          />
          {salary && <Meta label="Gaji / bulan" value={salary} accent />}
          {job.openings > 1 && (
            <Meta label="Slot tersedia" value={String(job.openings)} />
          )}
        </dl>

        <a
          href="#lamar"
          className={buttonClass({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
        >
          Lamar posisi ini
        </a>
      </header>

      <div className="mt-10 space-y-10">
        {job.description && (
          <Prose title="Deskripsi pekerjaan" content={job.description} />
        )}
        {job.requirements && (
          <Prose title="Kualifikasi" content={job.requirements} />
        )}
        {job.benefits && <Prose title="Benefit" content={job.benefits} />}
      </div>

      <section
        id="lamar"
        className="mt-16 scroll-mt-8 border-t border-line pt-10"
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
  return (
    <div>
      <dt className="text-label uppercase text-muted">
        {label}
      </dt>
      <dd
        className={
          accent
            ? "mt-1.5 text-body font-semibold text-gold-800"
            : "mt-1.5 text-body font-medium text-ink"
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
        <RichText content={content} />
      </div>
    </section>
  );
}

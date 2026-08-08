import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getPublicJobs, getPublicOrg } from "@/lib/public-data";
import {
  EMPLOYMENT_TYPE_LABEL,
  WORK_MODE_LABEL,
  formatSalaryRange,
} from "@/lib/utils";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) return { title: "Tidak ditemukan" };

  return {
    title: `Karier di ${org.name}`,
    description:
      org.about ?? `Lowongan kerja yang sedang dibuka di ${org.name}.`,
    openGraph: {
      title: `Karier di ${org.name}`,
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

  return (
    <div className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold-700">
        Karier
      </p>
      <h1 className="mt-3 text-[32px] font-semibold leading-[1.15] text-ink sm:text-[38px]">
        Bergabung dengan {org.name}
      </h1>
      {org.about && (
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
          {org.about}
        </p>
      )}

      <div className="mt-14 flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink">
          Posisi terbuka
        </h2>
        <span className="tabular text-[13px] text-muted">
          {jobs.length}
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-medium text-ink">
            Belum ada posisi yang dibuka
          </p>
          <p className="mt-2 text-[13px] text-muted">
            Cek kembali lain waktu, atau ikuti kanal resmi kami.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
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
                  className="group flex items-center gap-5 py-6 transition-opacity"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-medium text-ink transition-colors group-hover:text-gold-700">
                      {job.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] text-muted">
                      {meta.join("  ·  ")}
                    </p>
                    {salary && (
                      <p className="mt-2 text-[13px] font-medium text-ink-soft">
                        {salary}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-gold-500"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

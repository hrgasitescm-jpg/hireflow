import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  type BadgeTone,
} from "@/components/ui";
import {
  EMPLOYMENT_TYPE_LABEL,
  JOB_STATUS_LABEL,
  WORK_MODE_LABEL,
  timeAgo,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Lowongan" };

const STATUS_TONE: Record<string, BadgeTone> = {
  published: "green",
  draft: "neutral",
  pending_approval: "gold",
  approved: "gold",
  on_hold: "amber",
  closed: "red",
  archived: "neutral",
};

export default async function JobsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, title, slug, status, work_mode, employment_type, openings, created_at, locations(name)",
    )
    .eq("org_id", membership.org.id)
    .order("created_at", { ascending: false });

  const jobIds = (jobs ?? []).map((j) => j.id);

  const { data: apps } = jobIds.length
    ? await supabase
        .from("applications")
        .select("job_id")
        .in("job_id", jobIds)
        .eq("status", "active")
    : { data: [] };

  const counts = new Map<string, number>();
  for (const a of apps ?? []) {
    counts.set(a.job_id, (counts.get(a.job_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        eyebrow={
          jobs && jobs.length > 0
            ? `${jobs.length} lowongan · ${jobs.filter((j) => j.status === "published").length} terbit`
            : undefined
        }
        title="Lowongan"
        description="Semua posisi yang sedang dan pernah kamu buka."
        action={
          canManage(membership.role) ? (
            <ButtonLink href={`/${orgSlug}/jobs/new`}>Buat lowongan</ButtonLink>
          ) : undefined
        }
      />

      {jobs && jobs.length > 0 ? (
        <Card className="divide-y divide-line">
          {jobs.map((job) => {
            const location = job.locations as unknown as { name: string } | null;
            const meta = [
              location?.name,
              WORK_MODE_LABEL[job.work_mode],
              EMPLOYMENT_TYPE_LABEL[job.employment_type],
              job.openings > 1 ? `${job.openings} slot` : null,
            ].filter(Boolean);
            const applicants = counts.get(job.id) ?? 0;

            return (
              <Link
                key={job.id}
                href={`/${orgSlug}/jobs/${job.id}/pipeline`}
                className="group flex items-center gap-5 px-5 py-4 transition-colors first:rounded-t-surface last:rounded-b-surface hover:bg-line-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="truncate text-body font-semibold text-ink">
                      {job.title}
                    </span>
                    <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                      {JOB_STATUS_LABEL[job.status]}
                    </Badge>
                  </div>
                  <p className="mt-1.5 truncate text-caption text-muted">
                    {meta.join(" · ")}
                  </p>
                </div>

                {/* Jumlah pelamar dibuat sebagai pil, bukan angka telanjang.
                    Ini kolom yang paling sering dipindai mata saat membuka
                    daftar lowongan, jadi ia butuh bentuk sendiri. */}
                <div
                  className={
                    applicants > 0
                      ? "flex shrink-0 items-baseline gap-1.5 rounded-control bg-line-soft px-3 py-1.5 ring-1 ring-inset ring-line transition-colors group-hover:bg-surface"
                      : "flex shrink-0 items-baseline gap-1.5 px-3 py-1.5"
                  }
                >
                  <span
                    className={
                      applicants > 0
                        ? "tabular text-heading text-ink"
                        : "tabular text-heading text-subtle"
                    }
                  >
                    {applicants}
                  </span>
                  <span className="text-caption text-muted">pelamar</span>
                </div>

                <p className="hidden w-24 shrink-0 text-right text-caption text-subtle sm:block">
                  {timeAgo(job.created_at)}
                </p>
              </Link>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon={<Briefcase className="size-5" />}
          title="Belum ada lowongan"
          description="Buat lowongan pertama, lalu bagikan link career page-mu untuk mulai menerima lamaran."
          action={
            canManage(membership.role) ? (
              <ButtonLink href={`/${orgSlug}/jobs/new`}>
                Buat lowongan pertama
              </ButtonLink>
            ) : undefined
          }
        />
      )}
    </>
  );
}

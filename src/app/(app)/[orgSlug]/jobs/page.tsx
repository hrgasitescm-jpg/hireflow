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

            return (
              <Link
                key={job.id}
                href={`/${orgSlug}/jobs/${job.id}/pipeline`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-line-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-[14px] font-medium text-ink">
                      {job.title}
                    </span>
                    <Badge tone={STATUS_TONE[job.status] ?? "neutral"}>
                      {JOB_STATUS_LABEL[job.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{meta.join(" · ")}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="tabular text-[15px] font-semibold text-ink">
                    {counts.get(job.id) ?? 0}
                  </p>
                  <p className="text-[11px] text-muted">pelamar</p>
                </div>

                <p className="hidden w-24 shrink-0 text-right text-xs text-stone-400 sm:block">
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

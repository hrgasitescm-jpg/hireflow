import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, buttonClass } from "@/components/ui";
import { JOB_STATUS_LABEL } from "@/lib/utils";
import { PipelineBoard, type BoardApplication } from "@/components/pipeline-board";
import { JobStatusMenu } from "@/components/job-status-menu";
import { JobDraftBanner } from "@/components/job-draft-banner";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("title")
    .eq("id", jobId)
    .maybeSingle();
  return { title: data?.title ?? "Pipeline" };
}

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, slug, status, org_id")
    .eq("id", jobId)
    .maybeSingle();

  // RLS sudah menyaring; kalau null berarti bukan milik organisasi ini.
  if (!job || job.org_id !== membership.org.id) notFound();

  const [stagesRes, appsRes] = await Promise.all([
    supabase
      .from("job_stages")
      .select("id, name, position, kind")
      .eq("job_id", jobId)
      .order("position"),
    supabase
      .from("applications")
      .select(
        `id, stage_id, status, applied_at, stage_entered_at, ai_score,
         candidates!inner(id, full_name, email, headline, years_exp, skills)`,
      )
      .eq("job_id", jobId)
      .eq("status", "active")
      .order("applied_at", { ascending: false }),
  ]);

  const applications: BoardApplication[] = (appsRes.data ?? []).map((a) => {
    const c = a.candidates as unknown as {
      id: string;
      full_name: string;
      email: string;
      headline: string | null;
      years_exp: number | null;
      skills: string[];
    };
    return {
      id: a.id,
      stageId: a.stage_id,
      appliedAt: a.applied_at,
      stageEnteredAt: a.stage_entered_at,
      aiScore: a.ai_score,
      candidate: {
        id: c.id,
        fullName: c.full_name,
        email: c.email,
        headline: c.headline,
        yearsExp: c.years_exp,
        skills: c.skills ?? [],
      },
    };
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              {job.title}
            </h1>
            <Badge tone={job.status === "published" ? "green" : "neutral"}>
              {JOB_STATUS_LABEL[job.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {applications.length} pelamar aktif
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {job.status === "published" && (
            <a
              href={`/karier/${orgSlug}/${job.slug}`}
              target="_blank"
              rel="noreferrer"
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              <ExternalLink className="size-4" aria-hidden />
              Lihat publik
            </a>
          )}
          {canManage(membership.role) && (
            <>
              <Link
                href={`/${orgSlug}/jobs/${jobId}/edit`}
                className={buttonClass({ variant: "secondary", size: "sm" })}
              >
                <Pencil className="size-4" aria-hidden />
                Ubah
              </Link>
              <JobStatusMenu
                orgSlug={orgSlug}
                jobId={jobId}
                current={job.status}
              />
            </>
          )}
        </div>
      </div>

      {canManage(membership.role) && (
        <JobDraftBanner orgSlug={orgSlug} jobId={jobId} status={job.status} />
      )}

      <PipelineBoard
        orgSlug={orgSlug}
        jobId={jobId}
        stages={stagesRes.data ?? []}
        applications={applications}
        readOnly={!canManage(membership.role)}
      />
    </>
  );
}

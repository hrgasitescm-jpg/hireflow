import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase, Inbox } from "lucide-react";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { JOB_STATUS_LABEL, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dasbor" };

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();
  const orgId = membership.org.id;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [openJobs, totalCandidates, activeApps, newApps, recentJobs, recentApps] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "published"),
      supabase
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active"),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("applied_at", weekAgo),
      supabase
        .from("jobs")
        .select("id, slug, title, status, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("applications")
        .select(
          "id, applied_at, job_id, candidates!inner(full_name), jobs!inner(title, slug)",
        )
        .eq("org_id", orgId)
        .order("applied_at", { ascending: false })
        .limit(6),
    ]);

  const stats = [
    { label: "Lowongan terbit", value: openJobs.count ?? 0 },
    { label: "Total kandidat", value: totalCandidates.count ?? 0 },
    { label: "Lamaran aktif", value: activeApps.count ?? 0 },
    { label: "Masuk 7 hari", value: newApps.count ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title={membership.org.name}
        description="Ringkasan aktivitas rekrutmen."
        action={
          canManage(membership.role) ? (
            <ButtonLink href={`/${orgSlug}/jobs/new`}>Buat lowongan</ButtonLink>
          ) : undefined
        }
      />

      {/* Statistik: satu kartu, dipisah garis rambut — bukan empat kotak */}
      <Card className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={
              i < 2 ? "border-b border-line lg:border-b-0" : i === 2 ? "lg:border-0" : ""
            }
          >
            <Stat label={s.label} value={s.value} />
          </div>
        ))}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Lowongan terbaru</h2>
            <Link
              href={`/${orgSlug}/jobs`}
              className="text-[13px] text-muted hover:text-ink"
            >
              Semua
            </Link>
          </div>

          {recentJobs.data && recentJobs.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentJobs.data.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/${orgSlug}/jobs/${job.id}/pipeline`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-line-soft"
                  >
                    <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                      {job.title}
                    </span>
                    <Badge
                      tone={job.status === "published" ? "green" : "neutral"}
                    >
                      {JOB_STATUS_LABEL[job.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<Briefcase className="size-5" />}
                title="Belum ada lowongan"
                description="Buat lowongan pertama untuk mulai menerima lamaran."
                action={
                  canManage(membership.role) ? (
                    <ButtonLink href={`/${orgSlug}/jobs/new`} size="sm">
                      Buat lowongan
                    </ButtonLink>
                  ) : undefined
                }
              />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Pelamar terbaru</h2>
            <Link
              href={`/${orgSlug}/candidates`}
              className="text-[13px] text-muted hover:text-ink"
            >
              Semua
            </Link>
          </div>

          {recentApps.data && recentApps.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentApps.data.map((app) => {
                const candidate = app.candidates as unknown as {
                  full_name: string;
                };
                const job = app.jobs as unknown as { title: string };
                return (
                  <li key={app.id}>
                    <Link
                      href={`/${orgSlug}/jobs/${app.job_id}/pipeline`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-line-soft"
                    >
                      <Avatar name={candidate.full_name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {candidate.full_name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {job.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">
                        {timeAgo(app.applied_at)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-5">
              <EmptyState
                icon={<Inbox className="size-5" />}
                title="Belum ada pelamar"
                description="Bagikan link career page kamu supaya lamaran mulai masuk."
              />
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

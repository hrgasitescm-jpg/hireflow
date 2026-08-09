import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase, Inbox, ArrowRight } from "lucide-react";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  Stat,
} from "@/components/ui";
import { JOB_STATUS_LABEL, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

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

  /**
   * Funnel dibangun dari tahapan yang BENAR-BENAR ada di database, bukan dari
   * daftar tetap di kode.
   *
   * Versi pertama saya mengambil daftar dari constraint `kind` di skema —
   * termasuk 'assessment' — padahal trigger create_default_stages hanya
   * membuat lima tahap tanpa asesmen. Akibatnya selalu ada satu baris bernilai
   * nol yang terbaca seperti data hilang. Membaca dari job_stages juga membuat
   * funnel ikut benar begitu tahapan bisa diubah pengguna.
   *
   * Tahapan dikelompokkan per NAMA karena setiap lowongan punya barisnya
   * sendiri; tanpa pengelompokan, "Screening" akan muncul sebanyak jumlah
   * lowongan. Urutannya mengikuti posisi terkecil dalam kelompok.
   */
  const { data: stageRows } = await supabase
    .from("job_stages")
    .select("id, name, position, kind, jobs!inner(org_id)")
    .eq("jobs.org_id", orgId)
    .neq("kind", "rejected")
    .order("position");

  const grouped = new Map<string, { position: number; ids: string[] }>();
  for (const row of stageRows ?? []) {
    const key = row.name.trim();
    const existing = grouped.get(key);
    if (existing) {
      existing.ids.push(row.id);
      existing.position = Math.min(existing.position, row.position);
    } else {
      grouped.set(key, { position: row.position, ids: [row.id] });
    }
  }

  const stageGroups = [...grouped.entries()].sort(
    (a, b) => a[1].position - b[1].position,
  );

  /* Satu count head per nama tahap (biasanya lima), bukan menarik seluruh
     baris lamaran lalu menjumlahkan di JS — itu akan tumbuh tanpa batas. */
  const funnelCounts = await Promise.all(
    stageGroups.map(([, group]) =>
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active")
        .in("stage_id", group.ids),
    ),
  );

  const funnel = stageGroups.map(([label], i) => ({
    label,
    count: funnelCounts[i]?.count ?? 0,
  }));
  const funnelTop = funnel[0]?.count ?? 0;
  const funnelMax = Math.max(...funnel.map((s) => s.count), 1);
  const funnelTotal = funnel.reduce((sum, s) => sum + s.count, 0);

  const stats = [
    { label: "Lowongan terbit", value: openJobs.count ?? 0 },
    { label: "Total kandidat", value: totalCandidates.count ?? 0 },
    { label: "Lamaran aktif", value: activeApps.count ?? 0 },
    { label: "Masuk 7 hari", value: newApps.count ?? 0, accent: true },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={membership.org.name}
        description="Ringkasan aktivitas rekrutmen dan posisi setiap pelamar dalam pipeline."
        action={
          canManage(membership.role) ? (
            <ButtonLink href={`/${orgSlug}/jobs/new`}>Buat lowongan</ButtonLink>
          ) : undefined
        }
      />

      {/* Statistik: satu kartu dipisah garis, bukan empat kotak melayang.
          Satu angka disorot emas — "masuk 7 hari" adalah yang paling sering
          dicari saat orang membuka dasbor di pagi hari. */}
      <Card className="grid grid-cols-2 divide-line lg:grid-cols-4 lg:divide-x">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={
              i < 2 ? "border-b border-line lg:border-b-0" : i === 2 ? "lg:border-0" : ""
            }
          >
            <Stat label={s.label} value={s.value} accent={s.accent} />
          </div>
        ))}
      </Card>

      {/* ------------------------------------------------------------------
          Funnel pipeline

          Ini yang paling hilang dari dasbor lama: empat penghitung memberi
          tahu berapa banyak, tapi tidak memberi tahu di mana orang tersangkut.
          Persentase dihitung terhadap tahap pertama, sehingga penyusutan di
          tiap langkah langsung terbaca.
          ------------------------------------------------------------------ */}
      {/* ------------------------------------------------------------------
          Tata letak tiga kolom.

          Versi sebelumnya menumpuk funnel dan dua daftar secara vertikal,
          sehingga di monitor lebar separuh layar kosong dan pengguna harus
          menggulir untuk melihat pelamar terbaru. Sekarang pelamar terbaru
          menempati kolom kanan setinggi dua baris — ia daftar terpanjang,
          jadi ia yang paling diuntungkan oleh ruang vertikal.
          ------------------------------------------------------------------ */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Pipeline aktif"
          action={
            <span className="text-caption text-muted">
              <span className="tabular font-semibold text-ink">{funnelTotal}</span>{" "}
              lamaran berjalan
            </span>
          }
        />
        {funnelTotal > 0 ? (
          <ul className="divide-y divide-line">
            {funnel.map((stage) => {
              const share = funnelTop > 0 ? stage.count / funnelTop : 0;
              const width = (stage.count / funnelMax) * 100;
              return (
                <li
                  key={stage.label}
                  className="grid grid-cols-[8.5rem_1fr_4.5rem] items-center gap-4 px-5 py-3"
                >
                  <span className="truncate text-small font-medium text-ink-soft">
                    {stage.label}
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-2 min-w-0.5 rounded-full bg-gold-400 transition-[width]"
                      style={{ width: `${Math.max(width, stage.count > 0 ? 2 : 0)}%` }}
                    />
                    <span className="tabular text-small font-semibold text-ink">
                      {stage.count}
                    </span>
                  </span>
                  <span className="tabular justify-self-end text-caption text-muted">
                    {funnelTop > 0 ? `${Math.round(share * 100)}%` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-5">
            <EmptyState
              icon={<Inbox className="size-5" />}
              title="Pipeline masih kosong"
              description="Begitu ada lamaran masuk, sebarannya per tahap muncul di sini."
            />
          </div>
        )}
      </Card>


        <Card className="lg:row-span-2">
          <CardHeader
            title="Pelamar terbaru"
            action={
              <Link
                href={`/${orgSlug}/candidates`}
                className="inline-flex items-center gap-1 text-small font-medium text-muted transition-colors hover:text-ink"
              >
                Semua
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />

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
                        <span className="block truncate text-body font-medium text-ink">
                          {candidate.full_name}
                        </span>
                        <span className="block truncate text-caption text-muted">
                          {job.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-caption text-subtle">
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

        <Card className="lg:col-span-2">
          <CardHeader
            title="Lowongan terbaru"
            action={
              <Link
                href={`/${orgSlug}/jobs`}
                className="inline-flex items-center gap-1 text-small font-medium text-muted transition-colors hover:text-ink"
              >
                Semua
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />

          {recentJobs.data && recentJobs.data.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentJobs.data.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/${orgSlug}/jobs/${job.id}/pipeline`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-line-soft"
                  >
                    <span className="min-w-0 truncate text-body font-medium text-ink">
                      {job.title}
                    </span>
                    <Badge tone={job.status === "published" ? "green" : "neutral"}>
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
      </div>
    </>
  );
}

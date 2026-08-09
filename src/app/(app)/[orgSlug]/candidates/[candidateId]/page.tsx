import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, Link2, MapPin } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  Badge,
  Card,
  PageHeader,
  type BadgeTone,
} from "@/components/ui";
import {
  APPLICATION_STATUS_LABEL,
  formatDate,
  initials,
  timeAgo,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Profil kandidat" };

const STATUS_TONE: Record<string, BadgeTone> = {
  active: "gold",
  hired: "green",
  rejected: "red",
  withdrawn: "neutral",
  on_hold: "amber",
};

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string; candidateId: string }>;
}) {
  const { orgSlug, candidateId } = await params;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();

  if (!candidate || candidate.org_id !== membership.org.id) notFound();

  const [appsRes, notesRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, applied_at, job_id, jobs!inner(title), job_stages(name)")
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false }),
    supabase
      .from("notes")
      .select("id, body, created_at, profiles!notes_author_id_fkey(full_name)")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  /**
   * Jawaban pertanyaan screening.
   *
   * Sebelumnya tabel application_answers tidak pernah dibaca di layar mana
   * pun — recruiter tidak punya cara melihat jawaban pelamar. Diambil untuk
   * semua lamaran kandidat ini sekaligus, lalu dikelompokkan per lamaran.
   */
  const applicationIds = (appsRes.data ?? []).map((a) => a.id);
  const { data: answerRows } = applicationIds.length
    ? await supabase
        .from("application_answers")
        .select("application_id, answer, job_questions!inner(label, position)")
        .in("application_id", applicationIds)
    : { data: [] };

  const answersByApplication = new Map<
    string,
    { label: string; position: number; answer: unknown }[]
  >();
  for (const row of answerRows ?? []) {
    const question = row.job_questions as unknown as {
      label: string;
      position: number;
    };
    const list = answersByApplication.get(row.application_id) ?? [];
    list.push({
      label: question.label,
      position: question.position,
      answer: row.answer,
    });
    answersByApplication.set(row.application_id, list);
  }
  for (const list of answersByApplication.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const contact = [
    { icon: Mail, value: candidate.email, href: `mailto:${candidate.email}` },
    candidate.phone
      ? { icon: Phone, value: candidate.phone, href: `tel:${candidate.phone}` }
      : null,
    candidate.location_text
      ? { icon: MapPin, value: candidate.location_text, href: null }
      : null,
    candidate.linkedin_url
      ? {
          icon: Link2,
          value: "LinkedIn",
          href: candidate.linkedin_url,
        }
      : null,
  ].filter(Boolean) as {
    icon: typeof Mail;
    value: string;
    href: string | null;
  }[];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={candidate.full_name}
        description={candidate.headline ?? "Profil kandidat"}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-heading text-ink">
              Riwayat lamaran
            </h2>
            {appsRes.data && appsRes.data.length > 0 ? (
              <ul className="divide-y divide-line">
                {appsRes.data.map((a) => {
                  const job = a.jobs as unknown as { title: string };
                  const stage = a.job_stages as unknown as {
                    name: string;
                  } | null;
                  const answers = answersByApplication.get(a.id) ?? [];
                  return (
                    <li key={a.id}>
                      <Link
                        href={`/${orgSlug}/jobs/${a.job_id}/pipeline`}
                        className="flex items-center justify-between gap-3 py-3 hover:opacity-80"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-body font-semibold text-ink">
                            {job.title}
                          </p>
                          <p className="text-caption text-muted">
                            {stage?.name ?? "—"} · melamar{" "}
                            {formatDate(a.applied_at)}
                          </p>
                        </div>
                        <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                          {APPLICATION_STATUS_LABEL[a.status]}
                        </Badge>
                      </Link>

                      {answers.length > 0 && (
                        <dl className="mb-3 space-y-3 rounded-control bg-line-soft px-4 py-3 ring-1 ring-inset ring-line">
                          {answers.map((ans) => (
                            <div key={ans.label}>
                              <dt className="text-caption font-semibold text-ink-soft">
                                {ans.label}
                              </dt>
                              <dd className="mt-1 text-small whitespace-pre-wrap text-muted">
                                {typeof ans.answer === "string"
                                  ? ans.answer
                                  : JSON.stringify(ans.answer)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">Belum ada lamaran.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-heading text-ink">
              Catatan
            </h2>
            {notesRes.data && notesRes.data.length > 0 ? (
              <ul className="space-y-3">
                {notesRes.data.map((n) => {
                  const author = n.profiles as unknown as {
                    full_name: string;
                  } | null;
                  return (
                    <li key={n.id} className="rounded-control bg-line-soft p-3">
                      <p className="whitespace-pre-wrap text-sm text-ink-soft">
                        {n.body}
                      </p>
                      <p className="mt-1.5 text-caption text-subtle">
                        {author?.full_name ?? "Anggota tim"} ·{" "}
                        {timeAgo(n.created_at)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Belum ada catatan. Tambahkan lewat pipeline lowongan.
              </p>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={candidate.full_name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {candidate.full_name}
                </p>
                {candidate.years_exp != null && (
                  <p className="text-caption text-muted">
                    {candidate.years_exp} tahun pengalaman
                  </p>
                )}
              </div>
            </div>

            <ul className="space-y-2 text-sm">
              {contact.map(({ icon: Icon, value, href }) => (
                <li key={value} className="flex items-center gap-2 text-ink-soft">
                  <Icon className="size-4 shrink-0 text-subtle" aria-hidden />
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="truncate hover:underline"
                    >
                      {value}
                    </a>
                  ) : (
                    <span className="truncate">{value}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {candidate.skills.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 text-heading text-ink">Skill</h2>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5 text-caption text-muted">
            <p>Sumber: {candidate.source}</p>
            <p className="mt-1">Ditambahkan {formatDate(candidate.created_at)}</p>
            {candidate.consent_at && (
              <p className="mt-1">
                Persetujuan data: {formatDate(candidate.consent_at)}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

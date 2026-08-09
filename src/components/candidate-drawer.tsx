"use client";

import { useEffect, useState, useTransition } from "react";
import {
  X,
  Mail,
  Download,
  Check,
  Ban,
  Loader2,
  MessageCircle,
} from "lucide-react";
import {
  Alert,
  buttonClass,
  Avatar,
  Badge,
  Button,
  Select,
  Textarea,
} from "@/components/ui";
import { RichContent } from "@/components/rich-content";
import { formatDate } from "@/lib/utils";
import type { BoardApplication, BoardStage } from "@/components/pipeline-board";
import {
  addNote,
  getResumeUrl,
  moveApplicationStage,
  setApplicationStatus,
} from "@/app/(app)/[orgSlug]/jobs/[jobId]/actions";

type DrawerNote = {
  id: string;
  body: string;
  created_at: string;
  author: string;
};

export function CandidateDrawer({
  orgSlug,
  jobId,
  application,
  stages,
  readOnly,
  onClose,
}: {
  orgSlug: string;
  jobId: string;
  application: BoardApplication;
  stages: BoardStage[];
  readOnly: boolean;
  onClose: () => void;
}) {
  const { candidate } = application;
  const [notes, setNotes] = useState<DrawerNote[]>([]);
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<{
    link: string;
    stageName: string;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Tutup dengan tombol Escape (aksesibilitas)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoadingDetail(true);

    fetch(`/api/applications/${application.id}?org=${orgSlug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("gagal"))))
      .then(
        (data: {
          notes: DrawerNote[];
          resumeDocId: string | null;
          coverLetter: string | null;
          whatsapp: { link: string; stageName: string } | null;
        }) => {
        if (cancelled) return;
        setNotes(data.notes);
        setResumeDocId(data.resumeDocId);
        setCoverLetter(data.coverLetter);
        setWhatsapp(data.whatsapp);
      })
      .catch(() => !cancelled && setError("Gagal memuat detail kandidat."))
      .finally(() => !cancelled && setLoadingDetail(false));

    return () => {
      cancelled = true;
    };
  }, [application.id, orgSlug]);

  async function handleDownload() {
    if (!resumeDocId) return;
    const { url, error: e } = await getResumeUrl(orgSlug, resumeDocId);
    if (url) window.open(url, "_blank", "noopener");
    else setError(e ?? "Gagal membuka CV.");
  }

  function handleSubmitNote(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    startTransition(async () => {
      const result = await addNote(orgSlug, jobId, {
        applicationId: application.id,
        body,
      });
      if (result.ok) {
        setNoteBody("");
        setNotes((prev) => [
          {
            id: crypto.randomUUID(),
            body,
            created_at: new Date().toISOString(),
            author: "Kamu",
          },
          ...prev,
        ]);
      } else {
        setError(result.error ?? "Gagal menyimpan catatan.");
      }
    });
  }

  function handleStatus(status: "hired" | "rejected") {
    startTransition(async () => {
      const result = await setApplicationStatus(orgSlug, jobId, {
        applicationId: application.id,
        status,
      });
      if (result.ok) onClose();
      else setError(result.error ?? "Gagal mengubah status.");
    });
  }

  function handleStageChange(stageId: string) {
    startTransition(async () => {
      const result = await moveApplicationStage(orgSlug, jobId, {
        applicationId: application.id,
        stageId,
      });
      if (!result.ok) setError(result.error ?? "Gagal memindahkan tahap.");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal>
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-hidden
      />

      <div className="thin-scrollbar relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-white px-5 py-4">
          <Avatar name={candidate.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink">
              {candidate.fullName}
            </h2>
            {candidate.headline && (
              <p className="truncate text-sm text-muted">
                {candidate.headline}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-control p-1.5 text-subtle hover:bg-line-soft hover:text-ink-soft"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="space-y-6 px-5 py-5">
          {error && <Alert>{error}</Alert>}

          <section className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-ink-soft">
              <Mail className="size-4 shrink-0 text-subtle" aria-hidden />
              <a
                href={`mailto:${candidate.email}`}
                className="truncate hover:underline"
              >
                {candidate.email}
              </a>
            </div>
            <p className="text-muted">
              Melamar {formatDate(application.appliedAt)}
              {candidate.yearsExp != null &&
                ` · ${candidate.yearsExp} tahun pengalaman`}
            </p>
          </section>

          {/* Surat lamaran. Sebelumnya disimpan tapi tidak pernah
              ditampilkan di layar mana pun — pelamar menulis untuk kotak yang
              tidak pernah dibuka. */}
          {coverLetter && (
            <section>
              <h3 className="mb-2 text-label uppercase text-muted">
                Surat lamaran
              </h3>
              <div className="rounded-control bg-line-soft px-4 py-3 ring-1 ring-inset ring-line">
                <RichContent
                  value={coverLetter}
                  className="text-small leading-relaxed text-ink-soft"
                />
              </div>
            </section>
          )}

          {candidate.skills.length > 0 && (
            <section>
              <h3 className="mb-2 text-label uppercase text-muted">
                Skill
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-label uppercase text-muted">
              Tindakan
            </h3>

            {!readOnly && (
              <Select
                aria-label="Pindahkan ke tahap"
                value={application.stageId ?? ""}
                disabled={pending}
                onChange={(e) => handleStageChange(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}

            <div className="flex flex-wrap gap-2">
              {/* Aplikasi tidak mengirim apa pun — tautan ini membuka WhatsApp
                  recruiter dengan pesan sudah terisi sesuai tahap kandidat.
                  Yang menekan kirim tetap manusia. */}
              {whatsapp && (
                <a
                  href={whatsapp.link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonClass({ variant: "gold", size: "sm" })}
                  title={`Pesan untuk tahap ${whatsapp.stageName}`}
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                disabled={!resumeDocId || loadingDetail}
              >
                {loadingDetail ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {resumeDocId ? "Unduh CV" : "Tidak ada CV"}
              </Button>

              {!readOnly && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleStatus("hired")}
                    disabled={pending}
                  >
                    <Check className="size-4" aria-hidden />
                    Terima
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleStatus("rejected")}
                    disabled={pending}
                  >
                    <Ban className="size-4" aria-hidden />
                    Tolak
                  </Button>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-label uppercase text-muted">
              Catatan tim
            </h3>

            <form action={handleSubmitNote} className="space-y-2">
              <Textarea
                name="body"
                rows={3}
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Tulis catatan untuk tim…"
                maxLength={5000}
              />
              <Button type="submit" size="sm" disabled={pending || !noteBody.trim()}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Simpan catatan
              </Button>
            </form>

            <ul className="mt-4 space-y-3">
              {loadingDetail && (
                <li className="text-sm text-subtle">Memuat…</li>
              )}
              {!loadingDetail && notes.length === 0 && (
                <li className="text-sm text-subtle">Belum ada catatan.</li>
              )}
              {notes.map((n) => (
                <li key={n.id} className="rounded-control bg-line-soft p-3">
                  <p className="whitespace-pre-wrap text-sm text-ink-soft">
                    {n.body}
                  </p>
                  <p className="mt-1.5 text-caption text-subtle">
                    {n.author} · {formatDate(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

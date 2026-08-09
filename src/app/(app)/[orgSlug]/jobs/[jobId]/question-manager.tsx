"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  addQuestion,
  deleteQuestion,
  QUESTION_TYPE_LABEL,
  type QuestionState,
} from "./question-actions";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { KNOCKOUT_OP_LABEL, parseKnockoutRule } from "@/lib/knockout";
import { SubmitButton } from "@/components/submit-button";

export type ManagedQuestion = {
  id: string;
  label: string;
  help_text: string | null;
  type: string;
  required: boolean;
  is_knockout: boolean;
  knockout_rule: unknown;
  answerCount: number;
};

export function QuestionManager({
  orgSlug,
  jobId,
  questions,
}: {
  orgSlug: string;
  jobId: string;
  questions: ManagedQuestion[];
}) {
  const [adding, setAdding] = useState(false);
  const [knockout, setKnockout] = useState(false);
  const addFormRef = useRef<HTMLFormElement>(null);

  const [addState, addAction] = useActionState(
    addQuestion.bind(null, orgSlug, jobId),
    {} as QuestionState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteQuestion.bind(null, orgSlug, jobId),
    {} as QuestionState,
  );

  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
      setAdding(false);
      setKnockout(false);
    }
  }, [addState.success]);

  return (
    <div className="space-y-4">
      {questions.length > 0 ? (
        <ol className="divide-y divide-line rounded-control ring-1 ring-inset ring-line">
          {questions.map((q, i) => (
            <li key={q.id} className="flex items-start gap-3 px-3 py-3">
              <span className="tabular mt-0.5 w-5 shrink-0 text-caption text-subtle">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-small font-medium text-ink">{q.label}</p>
                {q.help_text && (
                  <p className="mt-1 text-caption text-muted">{q.help_text}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge>
                    {QUESTION_TYPE_LABEL[
                      q.type as keyof typeof QUESTION_TYPE_LABEL
                    ] ?? q.type}
                  </Badge>
                  {q.required && <Badge tone="gold">Wajib</Badge>}
                  {q.is_knockout && (() => {
                    const rule = parseKnockoutRule(q.knockout_rule);
                    return rule ? (
                      <Badge tone="red">
                        Gugur jika {KNOCKOUT_OP_LABEL[rule.op]} {String(rule.value)}
                      </Badge>
                    ) : null;
                  })()}
                  {q.answerCount > 0 && (
                    <span className="tabular text-caption text-muted">
                      {q.answerCount} jawaban masuk
                    </span>
                  )}
                </div>
              </div>

              {/* Tombol ditekan dua kali kalau sudah ada jawaban: tekan pertama
                  memunculkan peringatan dari server, tekan kedua mengirim
                  penanda konfirmasi. */}
              <form action={deleteAction} className="shrink-0">
                <input type="hidden" name="id" value={q.id} />
                <input
                  type="hidden"
                  name="confirmed"
                  value={deleteState.error ? "yes" : "no"}
                />
                <SubmitButton
                  size="sm"
                  variant="ghost"
                  aria-label={`Hapus pertanyaan ${q.label}`}
                  className="text-muted hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </SubmitButton>
              </form>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-control border border-dashed border-line-strong px-3 py-6 text-center text-caption text-muted">
          Belum ada pertanyaan. Pelamar hanya mengisi data dasar dan mengunggah
          CV.
        </p>
      )}

      {adding ? (
        <form
          ref={addFormRef}
          action={addAction}
          className="space-y-4 rounded-control bg-line-soft p-4 ring-1 ring-inset ring-line"
        >
          <Field label="Pertanyaan" htmlFor="label" required>
            <Input
              id="label"
              name="label"
              required
              autoFocus
              placeholder="Contoh: Berapa lama pengalaman kamu dengan Excel?"
            />
          </Field>

          <Field
            label="Teks bantuan"
            htmlFor="helpText"
            hint="Opsional. Muncul kecil di bawah pertanyaan."
          >
            <Input id="helpText" name="helpText" maxLength={300} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis jawaban" htmlFor="type" required>
              <Select id="type" name="type" defaultValue="text">
                {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex items-center gap-2.5 self-end pb-2.5 text-small text-ink-soft">
              <Checkbox name="required" />
              Wajib diisi
            </label>
          </div>

          {/* ------------------------------------------------------------
              Aturan penggugur

              Sengaja satu operator dan satu nilai. Aturan bergabung — "gugur
              jika A kurang dari 3 DAN B tidak sama dengan ya" — sulit
              dijelaskan di layar dan lebih sulit lagi dipertanggungjawabkan
              ketika pelamar bertanya kenapa ia gugur.
              ------------------------------------------------------------ */}
          <div className="rounded-control bg-surface p-4 ring-1 ring-inset ring-line">
            <label className="flex items-start gap-2.5 text-small text-ink-soft">
              <Checkbox
                name="isKnockout"
                className="mt-0.5"
                checked={knockout}
                onChange={(e) => setKnockout(e.target.checked)}
              />
              <span>
                Gugurkan pelamar otomatis
                <span className="mt-0.5 block text-caption text-muted">
                  Lamaran langsung masuk status ditolak tanpa menunggu ditinjau.
                  Pelamar tidak diberi tahu alasannya.
                </span>
              </span>
            </label>

            {knockout && (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Field label="Gugurkan jika jawabannya" htmlFor="knockoutOp">
                  <Select
                    id="knockoutOp"
                    name="knockoutOp"
                    defaultValue="lt"
                    className="w-48"
                  >
                    {Object.entries(KNOCKOUT_OP_LABEL).map(([op, label]) => (
                      <option key={op} value={op}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nilai pembanding" htmlFor="knockoutValue">
                  <Input
                    id="knockoutValue"
                    name="knockoutValue"
                    className="w-40"
                    placeholder="3"
                  />
                </Field>
              </div>
            )}
          </div>

          {addState.error && <Alert>{addState.error}</Alert>}

          <div className="flex gap-2">
            <SubmitButton size="sm">Tambah pertanyaan</SubmitButton>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Batal
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-3.5" aria-hidden />
          Tambah pertanyaan
        </Button>
      )}

      {deleteState.error && <Alert>{deleteState.error}</Alert>}
    </div>
  );
}

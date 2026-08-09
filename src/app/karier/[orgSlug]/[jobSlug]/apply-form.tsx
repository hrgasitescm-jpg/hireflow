"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Upload } from "lucide-react";
import { submitApplication, type ApplyState } from "./actions";
import {
  Alert,
  buttonClass,
  Checkbox,
  Field,
  Input,
  Textarea,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { MAX_RESUME_BYTES } from "@/lib/validation";

type Question = {
  id: string;
  label: string;
  help_text: string | null;
  type: string;
  required: boolean;
};

export function ApplyForm({
  orgSlug,
  jobSlug,
  orgName,
  questions,
}: {
  orgSlug: string;
  jobSlug: string;
  orgName: string;
  questions: Question[];
}) {
  const [state, action] = useActionState(
    submitApplication.bind(null, orgSlug, jobSlug),
    {} as ApplyState,
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  if (state.success) {
    return (
      <div className="mt-8 rounded-surface border border-line px-6 py-10 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-gold-50">
          <CheckCircle2 className="size-6 text-gold-600" aria-hidden />
        </span>
        <h3 className="mt-5 text-title text-ink">
          Lamaran kamu terkirim
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-body leading-relaxed text-muted">
          Tim {orgName} akan meninjau lamaranmu. Simpan tautan di bawah untuk
          memantau statusnya kapan saja.
        </p>
        {state.statusToken && (
          <Link
            href={`/status/${state.statusToken}`}
            className={buttonClass({ className: "mt-6" })}
          >
            Lihat status lamaran
          </Link>
        )}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="mt-8 space-y-6"
      encType="multipart/form-data"
    >
      {/* Honeypot: tersembunyi dari manusia, diisi oleh bot. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama lengkap" htmlFor="fullName" required>
          <Input id="fullName" name="fullName" required autoComplete="name" />
        </Field>

        <Field label="Email" htmlFor="email" required>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>

        <Field label="Nomor WhatsApp" htmlFor="phone" required>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="08123456789"
          />
        </Field>

        <Field label="Domisili" htmlFor="locationText">
          <Input
            id="locationText"
            name="locationText"
            placeholder="Jakarta Selatan"
          />
        </Field>

        <Field label="Total pengalaman (tahun)" htmlFor="yearsExp">
          <Input
            id="yearsExp"
            name="yearsExp"
            type="number"
            min={0}
            max={60}
            step="0.5"
          />
        </Field>

        <Field label="LinkedIn" htmlFor="linkedinUrl">
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            type="url"
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
      </div>

      <Field
        label="Portofolio / GitHub"
        htmlFor="portfolioUrl"
        hint="Opsional, tapi sangat membantu."
      >
        <Input
          id="portfolioUrl"
          name="portfolioUrl"
          type="url"
          placeholder="https://github.com/…"
        />
      </Field>

      <Field
        label="CV"
        htmlFor="resume"
        hint="Format PDF atau DOC/DOCX, maksimal 5 MB."
        error={fileError ?? undefined}
        required
      >
        <label
          htmlFor="resume"
          className="flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-line px-4 py-5 transition-colors hover:border-gold-400 hover:bg-gold-50/40"
        >
          <Upload
            className={
              fileName
                ? "size-5 shrink-0 text-gold-600"
                : "size-5 shrink-0 text-stone-400"
            }
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-small text-ink-soft">
            {fileName ?? "Pilih berkas CV…"}
          </span>
        </label>
        <input
          id="resume"
          name="resume"
          type="file"
          required
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setFileName(f?.name ?? null);
            setFileError(
              f && f.size > MAX_RESUME_BYTES ? "Ukuran CV maksimal 5 MB" : null,
            );
          }}
        />
      </Field>

      <Field
        label="Surat lamaran"
        htmlFor="coverLetter"
        hint="Ceritakan singkat kenapa kamu cocok untuk posisi ini."
      >
        <Textarea id="coverLetter" name="coverLetter" rows={5} maxLength={5000} />
      </Field>

      {questions.map((q) => (
        <Field
          key={q.id}
          label={q.label}
          htmlFor={`q_${q.id}`}
          hint={q.help_text ?? undefined}
          required={q.required}
        >
          {q.type === "textarea" ? (
            <Textarea id={`q_${q.id}`} name={`q_${q.id}`} required={q.required} />
          ) : (
            <Input
              id={`q_${q.id}`}
              name={`q_${q.id}`}
              type={q.type === "number" ? "number" : "text"}
              required={q.required}
            />
          )}
        </Field>
      ))}

      <label className="flex items-start gap-3 rounded-control bg-line-soft p-4 text-caption leading-relaxed text-ink-soft ring-1 ring-inset ring-line">
        <Checkbox name="consent" required className="mt-0.5" />
        <span>
          Saya menyetujui data pribadi saya diproses oleh {orgName} untuk
          keperluan rekrutmen, sesuai UU No. 27 Tahun 2022 tentang Pelindungan
          Data Pribadi. Saya bisa meminta penghapusan data kapan saja.
        </span>
      </label>

      {state.error && <Alert>{state.error}</Alert>}

      <SubmitButton size="lg" pendingLabel="Mengirim lamaran…">
        Kirim lamaran
      </SubmitButton>
    </form>
  );
}

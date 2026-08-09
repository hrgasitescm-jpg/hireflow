"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";
import { KNOCKOUT_OPS } from "@/lib/knockout";

/**
 * Pertanyaan screening per lowongan.
 *
 * Jenis yang boleh dibuat sengaja lebih sempit daripada yang diizinkan skema.
 * Constraint database menerima select/multiselect/boolean juga, tapi form
 * lamaran publik hanya merender textarea dan input teks — menawarkan jenis
 * yang tidak punya kontrolnya akan menghasilkan pertanyaan yang tampak ada
 * tapi tidak bisa dijawab dengan benar.
 */
const CREATABLE_TYPES = ["text", "textarea", "number", "url"] as const;
type CreatableType = (typeof CREATABLE_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<CreatableType, string> = {
  text: "Jawaban singkat",
  textarea: "Jawaban panjang",
  number: "Angka",
  url: "Tautan",
};

const questionSchema = z.object({
  isKnockout: z.boolean().default(false),
  knockoutOp: z.enum(KNOCKOUT_OPS).optional(),
  knockoutValue: z.string().trim().max(60).optional(),
  label: z
    .string()
    .trim()
    .min(3, "Pertanyaan minimal 3 karakter")
    .max(200, "Pertanyaan maksimal 200 karakter"),
  helpText: z.string().trim().max(300).default(""),
  type: z.enum(CREATABLE_TYPES),
  required: z.boolean().default(false),
});

export type QuestionState = { error?: string; success?: boolean };

async function guard(orgSlug: string, jobId: string) {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin mengubah pertanyaan." as const };
  }

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, slug")
    .eq("id", jobId)
    .eq("org_id", membership.org.id)
    .maybeSingle();

  if (!job) return { error: "Lowongan tidak ditemukan." as const };
  return { supabase, job };
}

function done(orgSlug: string, jobId: string, jobSlug: string): QuestionState {
  revalidatePath(`/${orgSlug}/jobs/${jobId}/edit`);
  revalidatePath(`/karier/${orgSlug}/${jobSlug}`);
  return { success: true };
}

export async function addQuestion(
  orgSlug: string,
  jobId: string,
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const parsed = questionSchema.safeParse({
    label: formData.get("label"),
    helpText: formData.get("helpText") ?? "",
    type: formData.get("type"),
    required: formData.get("required") === "on",
    isKnockout: formData.get("isKnockout") === "on",
    knockoutOp: formData.get("knockoutOp") || undefined,
    knockoutValue: formData.get("knockoutValue") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const { data: last } = await g.supabase
    .from("job_questions")
    .select("position")
    .eq("job_id", jobId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  /* Aturan hanya disimpan kalau penggugur dicentang DAN nilainya diisi.
     Menyimpan is_knockout tanpa aturan akan menghasilkan pertanyaan yang
     ditandai penggugur tapi tidak pernah menggugurkan siapa pun — jenis
     kejanggalan yang sulit ditelusuri kemudian. */
  const punyaAturan =
    parsed.data.isKnockout &&
    parsed.data.knockoutOp &&
    parsed.data.knockoutValue;

  if (parsed.data.isKnockout && !punyaAturan) {
    return { error: "Isi syarat penggugurnya, atau lepas centang penggugur." };
  }

  const { error } = await g.supabase.from("job_questions").insert({
    job_id: jobId,
    label: parsed.data.label,
    help_text: parsed.data.helpText || null,
    type: parsed.data.type,
    required: parsed.data.required,
    is_knockout: Boolean(punyaAturan),
    knockout_rule: punyaAturan
      ? { op: parsed.data.knockoutOp, value: parsed.data.knockoutValue }
      : null,
    position: (last?.position ?? 0) + 1,
  });

  if (error) return { error: error.message };
  return done(orgSlug, jobId, g.job.slug);
}

export async function deleteQuestion(
  orgSlug: string,
  jobId: string,
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pertanyaan tidak dikenal." };

  /* application_answers memakai on delete cascade ke question_id, jadi
     menghapus pertanyaan akan ikut menghapus jawaban yang sudah masuk.
     Pelamar tidak bisa mengisi ulang, jadi ini diberi peringatan tegas. */
  const { count } = await g.supabase
    .from("application_answers")
    .select("question_id", { count: "exact", head: true })
    .eq("question_id", id);

  if ((count ?? 0) > 0 && formData.get("confirmed") !== "yes") {
    return {
      error: `${count} pelamar sudah menjawab pertanyaan ini. Menghapusnya akan menghapus jawaban mereka juga. Tekan sekali lagi untuk memastikan.`,
    };
  }

  const { error } = await g.supabase
    .from("job_questions")
    .delete()
    .eq("id", id)
    .eq("job_id", jobId);

  if (error) return { error: error.message };
  return done(orgSlug, jobId, g.job.slug);
}

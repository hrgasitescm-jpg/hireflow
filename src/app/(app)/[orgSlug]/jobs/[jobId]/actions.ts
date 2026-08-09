"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";
import { decisionSchema, moveStageSchema, noteSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

/**
 * Memindahkan lamaran ke stage lain.
 * Keamanan berlapis:
 *   1. requireMembership -> user memang anggota organisasi ini
 *   2. canManage        -> perannya boleh mengubah
 *   3. RLS              -> baris di luar organisasinya tidak terlihat
 *   4. Trigger DB       -> stage harus milik job yang sama
 */
export async function moveApplicationStage(
  orgSlug: string,
  jobId: string,
  input: { applicationId: string; stageId: string },
): Promise<ActionResult> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { ok: false, error: "Kamu tidak punya izin memindahkan kandidat." };
  }

  const parsed = moveStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({ stage_id: parsed.data.stageId })
    .eq("id", parsed.data.applicationId)
    .eq("job_id", jobId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${orgSlug}/jobs/${jobId}/pipeline`);
  return { ok: true };
}

export async function setApplicationStatus(
  orgSlug: string,
  jobId: string,
  input: { applicationId: string; status: string; reason?: string },
): Promise<ActionResult> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { ok: false, error: "Kamu tidak punya izin mengubah status." };
  }

  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data tidak valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .update({
      status: parsed.data.status,
      rejection_reason:
        parsed.data.status === "rejected" ? parsed.data.reason || null : null,
    })
    .eq("id", parsed.data.applicationId)
    .eq("job_id", jobId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${orgSlug}/jobs/${jobId}/pipeline`);
  return { ok: true };
}

export async function addNote(
  orgSlug: string,
  jobId: string,
  input: { applicationId: string; body: string },
): Promise<ActionResult> {
  const membership = await requireMembership(orgSlug);

  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Tidak valid" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesi berakhir. Muat ulang halaman." };

  const { error } = await supabase.from("notes").insert({
    org_id: membership.org.id,
    application_id: parsed.data.applicationId,
    author_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/${orgSlug}/jobs/${jobId}/pipeline`);
  return { ok: true };
}

/** URL bertanda tangan untuk mengunduh CV. Kedaluwarsa 5 menit. */
/**
 * Menghasilkan tautan unduhan CV.
 *
 * Menerima ID dokumen, bukan path penyimpanan. Sebelumnya path dikirim dari
 * klien dan dijaga dengan memeriksa awalannya — cara itu masih bekerja untuk
 * Supabase yang path-nya memuat ID organisasi, tapi berkas Drive hanya punya
 * ID acak tanpa jejak kepemilikan. Mencari barisnya berdasarkan ID sambil
 * memfilter org_id membuat penjagaannya sama untuk kedua tempat penyimpanan.
 */
export async function getResumeUrl(
  orgSlug: string,
  documentId: string,
): Promise<{ url?: string; error?: string }> {
  const membership = await requireMembership(orgSlug);

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("candidate_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("org_id", membership.org.id)
    .maybeSingle();

  if (!doc) return { error: "Berkas tidak ditemukan." };

  /* Berkas Drive disalurkan lewat Worker; tidak ada padanan signed URL. */
  if (doc.storage_path.startsWith("gdrive:")) {
    return { url: `/api/resume/${documentId}` };
  }

  const { data, error } = await supabase.storage
    .from("resumes")
    .createSignedUrl(doc.storage_path, 300);

  if (error || !data) return { error: "Gagal membuat tautan unduhan." };
  return { url: data.signedUrl };
}

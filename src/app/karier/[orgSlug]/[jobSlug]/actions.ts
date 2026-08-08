"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationSchema, validateResume } from "@/lib/validation";
import { toE164 } from "@/lib/utils";

export type ApplyState = {
  error?: string;
  success?: boolean;
  statusToken?: string;
};

const CONSENT_VERSION = "2026-08-01";

/**
 * Rate limit sederhana berbasis memori.
 *
 * PENTING: ini hanya efektif untuk satu instance. Di serverless dengan
 * banyak instance, ganti dengan Upstash Redis atau tabel Postgres
 * sebelum produksi. Lihat catatan di README.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Bersihkan entri kedaluwarsa sesekali agar Map tidak tumbuh terus.
    if (attempts.size > 5000) {
      for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_{2,}/g, "_")
      .slice(-80) || "cv"
  );
}

export async function submitApplication(
  orgSlug: string,
  jobSlug: string,
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  // ---------- 1. Rate limit ----------
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (rateLimited(`${ip}:${jobSlug}`)) {
    return {
      error: "Terlalu banyak percobaan. Coba lagi dalam satu jam.",
    };
  }

  // ---------- 2. Validasi input ----------
  const parsed = applicationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    locationText: formData.get("locationText") ?? "",
    linkedinUrl: formData.get("linkedinUrl") ?? "",
    portfolioUrl: formData.get("portfolioUrl") ?? "",
    yearsExp: formData.get("yearsExp") || undefined,
    coverLetter: formData.get("coverLetter") ?? "",
    consent: formData.get("consent"),
    website: formData.get("website") ?? "", // honeypot
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const v = parsed.data;

  const resume = formData.get("resume");
  const file = resume instanceof File ? resume : null;
  const fileError = validateResume(file);
  if (fileError || !file) return { error: fileError ?? "CV wajib diunggah" };

  // ---------- 3. Pastikan lowongan memang terbuka ----------
  // Service role dipakai di sini karena pelamar anonim. Query difilter ketat.
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!org) return { error: "Perusahaan tidak ditemukan." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, org_id, status")
    .eq("org_id", org.id)
    .eq("slug", jobSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!job) return { error: "Lowongan ini sudah tidak menerima lamaran." };

  // ---------- 4. Upsert kandidat (dedup by email per organisasi) ----------
  const email = v.email.toLowerCase();

  const { data: existing } = await supabase
    .from("candidates")
    .select("id")
    .eq("org_id", org.id)
    .eq("email", email)
    .maybeSingle();

  let candidateId: string;

  if (existing) {
    candidateId = existing.id;
    await supabase
      .from("candidates")
      .update({
        full_name: v.fullName,
        phone: v.phone,
        phone_e164: toE164(v.phone),
        location_text: v.locationText || null,
        linkedin_url: v.linkedinUrl || null,
        portfolio_url: v.portfolioUrl || null,
        years_exp: v.yearsExp ?? null,
        consent_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      })
      .eq("id", candidateId);
  } else {
    const { data: created, error: createError } = await supabase
      .from("candidates")
      .insert({
        org_id: org.id,
        full_name: v.fullName,
        email,
        phone: v.phone,
        phone_e164: toE164(v.phone),
        location_text: v.locationText || null,
        linkedin_url: v.linkedinUrl || null,
        portfolio_url: v.portfolioUrl || null,
        years_exp: v.yearsExp ?? null,
        source: "career_page",
        consent_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      })
      .select("id")
      .single();

    if (createError || !created) {
      return { error: "Gagal menyimpan data. Coba lagi sebentar lagi." };
    }
    candidateId = created.id;
  }

  // ---------- 5. Cegah lamaran ganda ----------
  const { data: duplicate } = await supabase
    .from("applications")
    .select("id, access_token")
    .eq("job_id", job.id)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (duplicate) {
    return {
      error:
        "Kamu sudah pernah melamar posisi ini. Cek email untuk tautan status lamaranmu.",
    };
  }

  // ---------- 6. Simpan CV ----------
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const storagePath = `${org.id}/${candidateId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: "Gagal mengunggah CV. Pastikan ukuran di bawah 5 MB." };
  }

  await supabase.from("candidate_documents").insert({
    org_id: org.id,
    candidate_id: candidateId,
    kind: "resume",
    storage_path: storagePath,
    file_name: sanitizeFileName(file.name),
    mime_type: file.type,
    size_bytes: file.size,
  });

  // ---------- 7. Buat lamaran di stage pertama ----------
  const { data: firstStage } = await supabase
    .from("job_stages")
    .select("id")
    .eq("job_id", job.id)
    .order("position")
    .limit(1)
    .maybeSingle();

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      // org_id tetap dikirim demi tipe, tapi trigger set_application_org()
      // akan menimpanya dengan org_id milik job — itulah sumber kebenarannya.
      org_id: org.id,
      job_id: job.id,
      candidate_id: candidateId,
      stage_id: firstStage?.id ?? null,
      cover_letter: v.coverLetter || null,
    })
    .select("id, access_token")
    .single();

  if (applicationError || !application) {
    // CV sudah terunggah tapi lamaran gagal — bersihkan supaya tidak jadi sampah.
    await supabase.storage.from("resumes").remove([storagePath]);
    return { error: "Gagal mengirim lamaran. Coba lagi sebentar lagi." };
  }

  await supabase.from("activities").insert({
    org_id: org.id,
    entity_type: "application",
    entity_id: application.id,
    action: "applied",
    metadata: { source: "career_page" },
  });

  revalidatePath(`/${orgSlug}/jobs/${job.id}/pipeline`);

  // TODO Fase 2: masukkan email konfirmasi ke antrean (job_queue) di sini,
  // jangan mengirim langsung — batas Resend 100 email/hari.

  return { success: true, statusToken: application.access_token };
}

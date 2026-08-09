"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationSchema, validateResume } from "@/lib/validation";
import { driveConfig, uploadResume } from "@/lib/google-drive";
import { sanitizeRichInput } from "@/lib/rich-text";
import {
  isKnockedOut,
  knockoutReason,
  parseKnockoutRule,
} from "@/lib/knockout";
import { toE164 } from "@/lib/utils";

export type ApplyState = {
  error?: string;
  success?: boolean;
  statusToken?: string;
};

const CONSENT_VERSION = "2026-08-01";

/**
 * Rate limit form lamaran publik.
 *
 * Penghitungnya ada di Postgres (lihat 0004_rate_limit.sql), bukan di memori
 * proses. Versi lama memakai Map, dan itu hanya bekerja kalau aplikasi
 * berjalan sebagai satu instance berumur panjang — di Cloudflare Workers
 * setiap isolate punya memorinya sendiri dan berumur pendek, sehingga
 * batasnya praktis hilang.
 *
 * Kalau pemeriksaan gagal karena masalah jaringan atau database, permintaan
 * DILOLOSKAN, bukan ditolak. Rate limit adalah perlindungan terhadap
 * penyalahgunaan, bukan kontrol keamanan; menolak semua pelamar hanya karena
 * satu query gagal jauh lebih merugikan daripada meloloskan beberapa
 * permintaan berlebih.
 */
const WINDOW_SECONDS = 60 * 60;
const MAX_PER_WINDOW = 10;

async function rateLimited(
  supabase: ReturnType<typeof createAdminClient>,
  key: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max: MAX_PER_WINDOW,
    p_window_seconds: WINDOW_SECONDS,
  });

  if (error) {
    console.error("Pemeriksaan rate limit gagal:", error.message);
    return false;
  }
  return data === true;
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
  // Service role dipakai di sepanjang aksi ini karena pelamarnya anonim.
  // Setiap query difilter ketat dan setiap input divalidasi lebih dulu.
  const supabase = createAdminClient();

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (await rateLimited(supabase, `${ip}:${jobSlug}`)) {
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
    // Datang dari internet terbuka, jadi dibersihkan terhadap daftar node
    // yang diizinkan sebelum menyentuh database.
    coverLetter: sanitizeRichInput(formData.get("coverLetter")),
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
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .is("deleted_at", null)
    .maybeSingle();

  if (!org) return { error: "Perusahaan tidak ditemukan." };

  const { data: job } = await supabase
    .from("jobs")
    .select("id, org_id, status, title")
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
  /**
   * Google Drive adalah tempat utama supaya tim HR bisa menelusuri CV
   * langsung dari Drive tanpa membuka aplikasi.
   *
   * Supabase Storage tetap jadi jaring pengaman. Kalau token Google dicabut
   * atau Drive sedang bermasalah, lamaran TIDAK dibatalkan — CV-nya jatuh ke
   * Supabase dan lamaran tetap masuk. Kehilangan seorang pelamar jauh lebih
   * mahal daripada satu CV yang telat sampai ke Drive.
   *
   * Kolom storage_path menampung keduanya, dibedakan lewat awalan `gdrive:`.
   * Itu menghindari perubahan skema dan membuat berkas lama tetap terbaca.
   */
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  let storagePath: string | null = null;
  let supabasePath: string | null = null;

  const drive = driveConfig();
  if (drive) {
    try {
      const uploaded = await uploadResume(drive, {
        file,
        candidateName: v.fullName,
        jobTitle: job.title,
      });
      storagePath = `gdrive:${uploaded.fileId}`;
    } catch (err) {
      console.error(
        "Unggah ke Google Drive gagal, jatuh ke Supabase Storage:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (!storagePath) {
    supabasePath = `${org.id}/${candidateId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(supabasePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: "Gagal mengunggah CV. Pastikan ukuran di bawah 5 MB." };
    }
    storagePath = supabasePath;
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
    /* CV sudah terunggah tapi lamaran gagal. Yang di Supabase dibersihkan;
       yang di Drive dibiarkan karena menghapus berkas orang lain lebih
       berbahaya daripada menyisakan satu berkas yatim yang terlihat HR. */
    if (supabasePath) {
      await supabase.storage.from("resumes").remove([supabasePath]);
    }
    return { error: "Gagal mengirim lamaran. Coba lagi sebentar lagi." };
  }

  // ---------- 8. Simpan jawaban pertanyaan screening ----------
  /**
   * Form lamaran sudah lama merender pertanyaan dari job_questions, tapi tidak
   * ada satu baris pun yang membaca jawabannya — jawaban pelamar hilang diam
   * -diam. Bagian ini yang menutup lubang itu.
   *
   * Pertanyaan diambil ulang dari database, bukan dipercaya dari formData:
   * kalau tidak, siapa pun bisa mengirim q_<uuid> sembarangan dan menanam
   * baris untuk pertanyaan milik lowongan lain.
   */
  const { data: questions } = await supabase
    .from("job_questions")
    .select("id, type, required, label, is_knockout, knockout_rule")
    .eq("job_id", job.id);

  const answers = (questions ?? [])
    .map((q) => {
      const raw = formData.get(`q_${q.id}`);
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) return null;

      /* Kolomnya jsonb, jadi tipe disimpan sesuai jenis pertanyaan supaya
         nanti bisa difilter tanpa menebak-nebak isi string. */
      let value: unknown = text;
      if (q.type === "number") {
        const n = Number(text);
        value = Number.isFinite(n) ? n : text;
      } else if (q.type === "boolean") {
        value = text === "true" || text === "on" || text === "ya";
      }

      return {
        application_id: application.id,
        question_id: q.id,
        answer: value as never,
      };
    })
    .filter((a) => a !== null);

  if (answers.length > 0) {
    const { error: answersError } = await supabase
      .from("application_answers")
      .insert(answers);

    /* Lamarannya sendiri sudah tersimpan. Gagal menyimpan jawaban tidak boleh
       membatalkan lamaran — pelamar sudah menyerahkan CV dan datanya. Cukup
       dicatat supaya recruiter tahu ada yang tidak lengkap. */
    if (answersError) {
      console.error("Gagal menyimpan jawaban screening:", answersError.message);
    }
  }

  // ---------- 9. Evaluasi pertanyaan penggugur ----------
  /**
   * Dijalankan setelah lamaran dan jawaban tersimpan, bukan sebelumnya.
   *
   * Pelamar yang gugur tetap tercatat lengkap beserta CV dan jawabannya. Kalau
   * penggugurannya dilakukan lebih dulu dan lamarannya tidak jadi disimpan,
   * recruiter kehilangan jejak siapa saja yang pernah melamar — dan aturan
   * penggugur yang ternyata terlalu ketat tidak akan pernah ketahuan.
   *
   * Pelamar tidak diberi tahu. Ini praktik lazim, dan memberitahunya di layar
   * yang sama dengan "lamaran terkirim" akan terasa mempermainkan.
   */
  const gugur = (questions ?? [])
    .filter((q) => q.is_knockout)
    .map((q) => {
      const rule = parseKnockoutRule(q.knockout_rule);
      if (!rule) return null;
      const raw = formData.get(`q_${q.id}`);
      const jawaban = typeof raw === "string" ? raw.trim() : "";
      return isKnockedOut(jawaban, rule)
        ? knockoutReason(q.label, rule)
        : null;
    })
    .find((r) => r !== null);

  if (gugur) {
    const { error: koError } = await supabase
      .from("applications")
      .update({
        status: "rejected",
        rejection_reason: gugur,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (koError) {
      console.error("Gagal menandai lamaran gugur:", koError.message);
    }
  }

  await supabase.from("activities").insert({
    org_id: org.id,
    entity_type: "application",
    entity_id: application.id,
    action: gugur ? "knocked_out" : "applied",
    metadata: { source: "career_page", answers: answers.length },
  });

  revalidatePath(`/${orgSlug}/jobs/${job.id}/pipeline`);

  // TODO Fase 2: masukkan email konfirmasi ke antrean (job_queue) di sini,
  // jangan mengirim langsung — batas Resend 100 email/hari.

  return { success: true, statusToken: application.access_token };
}

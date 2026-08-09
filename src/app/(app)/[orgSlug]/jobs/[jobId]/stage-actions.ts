"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";

/**
 * Pengelolaan tahapan pipeline per lowongan.
 *
 * Dua kendala skema yang membentuk seluruh berkas ini:
 *
 * 1. `unique (job_id, position)` — menukar dua tahap tidak bisa dilakukan
 *    dengan dua UPDATE biasa, karena sesaat setelah UPDATE pertama akan ada
 *    dua baris berposisi sama. Constraint-nya deferrable, tapi Supabase JS
 *    tidak memberi kita transaksi untuk menunda pengecekannya. Solusinya
 *    memarkir satu baris di posisi negatif sementara — tiga UPDATE, tiap
 *    langkah tetap unik.
 *
 * 2. `applications.stage_id ... on delete set null` — menghapus tahap yang
 *    masih berisi kandidat akan membuat kandidat itu lenyap dari papan tanpa
 *    peringatan. Maka penghapusan ditolak selama masih ada isinya.
 */

const nameSchema = z
  .string()
  .trim()
  .min(2, "Nama tahap minimal 2 karakter")
  .max(40, "Nama tahap maksimal 40 karakter");

export type StageState = { error?: string; success?: boolean };

/** Posisi parkir sementara saat menukar urutan. Di luar jangkauan normal. */
const PARKING_POSITION = -1;

async function guard(orgSlug: string, jobId: string) {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin mengubah tahapan." as const };
  }

  const supabase = await createClient();
  /* Pastikan lowongan memang milik organisasi ini. RLS sudah menjaga, tapi
     pemeriksaan eksplisit memberi pesan yang jelas alih-alih baris nol. */
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("org_id", membership.org.id)
    .maybeSingle();

  if (!job) return { error: "Lowongan tidak ditemukan." as const };
  return { supabase, membership };
}

function done(orgSlug: string, jobId: string): StageState {
  revalidatePath(`/${orgSlug}/jobs/${jobId}/edit`);
  revalidatePath(`/${orgSlug}/jobs/${jobId}/pipeline`);
  revalidatePath(`/${orgSlug}/dashboard`);
  return { success: true };
}

export async function addStage(
  orgSlug: string,
  jobId: string,
  _prev: StageState,
  formData: FormData,
): Promise<StageState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nama tidak valid" };
  }

  /* Tahap baru selalu masuk sebelum tahap terakhir kalau tahap terakhir
     adalah 'hired' — menaruh "Diterima" di tengah pipeline tidak masuk akal.
     Selain itu, tempelkan di paling belakang. */
  const { data: stages } = await g.supabase
    .from("job_stages")
    .select("id, position, kind")
    .eq("job_id", jobId)
    .order("position");

  const list = stages ?? [];
  const last = list[list.length - 1];
  const insertAt =
    last && last.kind === "hired" ? last.position : (last?.position ?? 0) + 1;

  /* Geser mundur dulu semua tahap dari titik sisip ke belakang, dimulai dari
     yang paling belakang supaya tidak pernah ada dua baris berposisi sama. */
  const toShift = list.filter((s) => s.position >= insertAt).reverse();
  for (const s of toShift) {
    const { error } = await g.supabase
      .from("job_stages")
      .update({ position: s.position + 1 })
      .eq("id", s.id);
    if (error) return { error: error.message };
  }

  const { error } = await g.supabase.from("job_stages").insert({
    job_id: jobId,
    name: parsed.data,
    position: insertAt,
    kind: "custom",
  });
  if (error) return { error: error.message };

  return done(orgSlug, jobId);
}

export async function renameStage(
  orgSlug: string,
  jobId: string,
  _prev: StageState,
  formData: FormData,
): Promise<StageState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tahap tidak dikenal." };

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nama tidak valid" };
  }

  const { error } = await g.supabase
    .from("job_stages")
    .update({ name: parsed.data })
    .eq("id", id)
    .eq("job_id", jobId);

  if (error) return { error: error.message };
  return done(orgSlug, jobId);
}

export async function deleteStage(
  orgSlug: string,
  jobId: string,
  _prev: StageState,
  formData: FormData,
): Promise<StageState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Tahap tidak dikenal." };

  const { count: stageCount } = await g.supabase
    .from("job_stages")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  if ((stageCount ?? 0) <= 1) {
    return { error: "Lowongan harus punya minimal satu tahap." };
  }

  /* Tolak kalau masih ada kandidat di dalamnya. Foreign key-nya
     on delete set null, jadi kandidatnya tidak terhapus — tapi stage_id-nya
     jadi null dan mereka menghilang dari papan tanpa jejak. */
  const { count: appCount } = await g.supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id);

  if ((appCount ?? 0) > 0) {
    return {
      error: `Masih ada ${appCount} kandidat di tahap ini. Pindahkan mereka dulu lewat papan pipeline.`,
    };
  }

  const { error } = await g.supabase
    .from("job_stages")
    .delete()
    .eq("id", id)
    .eq("job_id", jobId);

  if (error) return { error: error.message };
  return done(orgSlug, jobId);
}

export async function moveStage(
  orgSlug: string,
  jobId: string,
  _prev: StageState,
  formData: FormData,
): Promise<StageState> {
  const g = await guard(orgSlug, jobId);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) {
    return { error: "Perintah pemindahan tidak dikenal." };
  }

  const { data: stages } = await g.supabase
    .from("job_stages")
    .select("id, position")
    .eq("job_id", jobId)
    .order("position");

  const list = stages ?? [];
  const index = list.findIndex((s) => s.id === id);
  if (index < 0) return { error: "Tahap tidak ditemukan." };

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  const current = list[index];
  const neighbor = list[neighborIndex];
  if (!current || !neighbor) return { success: true }; // sudah di ujung

  // Tiga langkah, tiap langkah menjaga unique (job_id, position) tetap sah.
  const steps = [
    { id: current.id, position: PARKING_POSITION },
    { id: neighbor.id, position: current.position },
    { id: current.id, position: neighbor.position },
  ];

  for (const step of steps) {
    const { error } = await g.supabase
      .from("job_stages")
      .update({ position: step.position })
      .eq("id", step.id)
      .eq("job_id", jobId);
    if (error) return { error: error.message };
  }

  return done(orgSlug, jobId);
}

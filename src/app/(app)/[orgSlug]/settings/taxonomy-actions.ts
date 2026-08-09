"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";

/**
 * Departemen & Lokasi.
 *
 * Kedua tabel bentuknya sama persis — id, org_id, name, unique(org_id, name) —
 * jadi satu berkas aksi melayani keduanya lewat parameter `kind`. Menyalin
 * logika yang sama dua kali hanya menambah tempat untuk lupa memperbaiki.
 *
 * RLS sudah membatasi tulis ke can_manage_org(), tapi peran tetap diperiksa
 * di sini juga supaya pengguna mendapat pesan yang bisa dibaca, bukan error
 * mentah dari database.
 */

const KINDS = ["departments", "locations"] as const;
export type TermKind = (typeof KINDS)[number];

const LABEL: Record<TermKind, string> = {
  departments: "Departemen",
  locations: "Lokasi",
};

export type TermState = { error?: string; success?: boolean };

const nameSchema = z
  .string()
  .trim()
  .min(2, "Nama minimal 2 karakter")
  .max(60, "Nama maksimal 60 karakter");

function parseKind(value: FormDataEntryValue | null): TermKind | null {
  return KINDS.includes(value as TermKind) ? (value as TermKind) : null;
}

/** Kode unique_violation Postgres — nama sudah dipakai di organisasi ini. */
const UNIQUE_VIOLATION = "23505";

export async function createTerm(
  orgSlug: string,
  _prev: TermState,
  formData: FormData,
): Promise<TermState> {
  const kind = parseKind(formData.get("kind"));
  if (!kind) return { error: "Jenis data tidak dikenal." };

  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: `Kamu tidak punya izin menambah ${LABEL[kind]}.` };
  }

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nama tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(kind)
    .insert({ org_id: membership.org.id, name: parsed.data });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `${LABEL[kind]} "${parsed.data}" sudah ada.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/${orgSlug}/settings`);
  revalidatePath(`/${orgSlug}/jobs`, "layout");
  return { success: true };
}

export async function renameTerm(
  orgSlug: string,
  _prev: TermState,
  formData: FormData,
): Promise<TermState> {
  const kind = parseKind(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  if (!kind || !id) return { error: "Data tidak lengkap." };

  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: `Kamu tidak punya izin mengubah ${LABEL[kind]}.` };
  }

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nama tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from(kind)
    .update({ name: parsed.data })
    .eq("id", id)
    .eq("org_id", membership.org.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: `${LABEL[kind]} "${parsed.data}" sudah ada.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/${orgSlug}/settings`);
  revalidatePath(`/${orgSlug}/jobs`, "layout");
  revalidatePath(`/karier/${orgSlug}`, "layout");
  return { success: true };
}

export async function deleteTerm(
  orgSlug: string,
  _prev: TermState,
  formData: FormData,
): Promise<TermState> {
  const kind = parseKind(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  if (!kind || !id) return { error: "Data tidak lengkap." };

  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: `Kamu tidak punya izin menghapus ${LABEL[kind]}.` };
  }

  const supabase = await createClient();
  /* Foreign key di jobs memakai on delete set null, jadi lowongan yang
     memakai istilah ini tidak ikut terhapus — hanya kehilangan labelnya. */
  const { error } = await supabase
    .from(kind)
    .delete()
    .eq("id", id)
    .eq("org_id", membership.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  revalidatePath(`/${orgSlug}/jobs`, "layout");
  revalidatePath(`/karier/${orgSlug}`, "layout");
  return { success: true };
}

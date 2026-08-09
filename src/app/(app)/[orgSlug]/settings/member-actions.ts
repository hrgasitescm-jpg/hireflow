"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMembership, requireUser, canAdmin } from "@/lib/auth";
import type { Enums } from "@/lib/database.types";

/**
 * Anggota tim.
 *
 * Catatan penting soal cara kerja "undangan" di sini.
 *
 * Email tidak disimpan di tabel profiles — hanya ada di auth.users — dan
 * org_members.user_id mengacu ke profiles. Jadi seseorang harus sudah punya
 * akun sebelum bisa dimasukkan ke organisasi.
 *
 * Mengirim undangan lewat email butuh SMTP yang belum dikonfigurasi
 * (README menandainya Fase 2, dan email bawaan Supabase dibatasi beberapa
 * pesan per jam sehingga tidak layak dipakai sungguhan). Maka alurnya:
 * orangnya mendaftar sendiri di /register, lalu admin menambahkannya di sini
 * memakai email yang sama. Ini berfungsi hari ini tanpa layanan tambahan.
 */

const ROLES = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "interviewer",
  "agency",
  "viewer",
] as const;

const addSchema = z.object({
  email: z.email("Format email tidak valid"),
  role: z.enum(ROLES),
});

export type MemberState = { error?: string; success?: string };

/** Batas aman penelusuran daftar user. Admin API tidak menyediakan filter email. */
const MAX_USER_PAGES = 10;
const USERS_PER_PAGE = 200;

async function guard(orgSlug: string) {
  const membership = await requireMembership(orgSlug);
  if (!canAdmin(membership.role)) {
    return { error: "Hanya Pemilik dan Admin yang bisa mengelola anggota." as const };
  }
  const supabase = await createClient();
  return { supabase, membership };
}

export async function addMember(
  orgSlug: string,
  _prev: MemberState,
  formData: FormData,
): Promise<MemberState> {
  const g = await guard(orgSlug);
  if ("error" in g) return { error: g.error };

  const parsed = addSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const email = parsed.data.email.trim().toLowerCase();

  /* Admin API tidak punya pencarian berdasarkan email, jadi daftarnya
     ditelusuri halaman demi halaman. Dibatasi supaya tidak pernah berubah
     jadi penelusuran tak berujung kalau suatu saat penggunanya banyak. */
  const admin = createAdminClient();
  let userId: string | null = null;

  for (let page = 1; page <= MAX_USER_PAGES && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) return { error: error.message };
    if (!data.users.length) break;

    userId =
      data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;

    if (data.users.length < USERS_PER_PAGE) break;
  }

  if (!userId) {
    return {
      error: `Belum ada akun dengan email ${email}. Minta orangnya mendaftar dulu di halaman Daftar, lalu tambahkan lagi di sini.`,
    };
  }

  const { data: existing } = await g.supabase
    .from("org_members")
    .select("id")
    .eq("org_id", g.membership.org.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { error: "Orang ini sudah jadi anggota organisasi." };

  const currentUser = await requireUser();
  const { error } = await g.supabase.from("org_members").insert({
    org_id: g.membership.org.id,
    user_id: userId,
    role: parsed.data.role,
    status: "active",
    invited_by: currentUser.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: `${email} berhasil ditambahkan.` };
}

export async function changeMemberRole(
  orgSlug: string,
  _prev: MemberState,
  formData: FormData,
): Promise<MemberState> {
  const g = await guard(orgSlug);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !ROLES.includes(role as Enums<"org_role">)) {
    return { error: "Peran tidak dikenal." };
  }

  const guardResult = await protectLastOwner(orgSlug, id, role);
  if (guardResult) return guardResult;

  const { error } = await g.supabase
    .from("org_members")
    .update({ role: role as Enums<"org_role"> })
    .eq("id", id)
    .eq("org_id", g.membership.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "Peran diperbarui." };
}

export async function removeMember(
  orgSlug: string,
  _prev: MemberState,
  formData: FormData,
): Promise<MemberState> {
  const g = await guard(orgSlug);
  if ("error" in g) return { error: g.error };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Anggota tidak dikenal." };

  const guardResult = await protectLastOwner(orgSlug, id, null);
  if (guardResult) return guardResult;

  const { error } = await g.supabase
    .from("org_members")
    .delete()
    .eq("id", id)
    .eq("org_id", g.membership.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "Anggota dikeluarkan." };
}

/**
 * Mencegah organisasi kehilangan pemilik terakhirnya.
 *
 * Tanpa ini, seorang Owner bisa menurunkan perannya sendiri atau mengeluarkan
 * dirinya, dan organisasi jadi tidak punya siapa pun yang berwenang mengubah
 * keanggotaan — tidak ada jalan pulih dari dalam aplikasi.
 */
async function protectLastOwner(
  orgSlug: string,
  memberId: string,
  newRole: string | null,
): Promise<MemberState | null> {
  if (newRole === "owner") return null;

  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const { data: target } = await supabase
    .from("org_members")
    .select("role")
    .eq("id", memberId)
    .eq("org_id", membership.org.id)
    .maybeSingle();

  if (target?.role !== "owner") return null;

  const { count } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("org_id", membership.org.id)
    .eq("role", "owner");

  if ((count ?? 0) <= 1) {
    return {
      error:
        "Ini satu-satunya Pemilik. Angkat orang lain jadi Pemilik dulu sebelum mengubah atau mengeluarkan yang ini.",
    };
  }
  return null;
}

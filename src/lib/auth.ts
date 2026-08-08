import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/database.types";

export type Membership = {
  org: Pick<Tables<"organizations">, "id" | "slug" | "name" | "logo_url" | "brand_color">;
  role: Enums<"org_role">;
};

/** User yang sedang login, atau null. Di-cache per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Semua organisasi tempat user aktif menjadi anggota. */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("role, organizations!inner(id, slug, name, logo_url, brand_color)")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    role: row.role,
    org: row.organizations as Membership["org"],
  }));
});

/**
 * Memastikan user adalah anggota organisasi dengan slug tertentu.
 * Kalau bukan, 404 — bukan 403, supaya keberadaan organisasi tidak bocor.
 */
export async function requireMembership(orgSlug: string): Promise<Membership> {
  await requireUser();
  const memberships = await getMemberships();
  const found = memberships.find(
    (m) => m.org.slug.toLowerCase() === orgSlug.toLowerCase(),
  );
  if (!found) redirect("/");
  return found;
}

const MANAGER_ROLES: Enums<"org_role">[] = ["owner", "admin", "recruiter"];

export function canManage(role: Enums<"org_role">): boolean {
  return MANAGER_ROLES.includes(role);
}

export function canAdmin(role: Enums<"org_role">): boolean {
  return role === "owner" || role === "admin";
}

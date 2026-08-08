"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canAdmin } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
  about: z.string().trim().max(2000).default(""),
  website: z.union([z.url("URL tidak valid"), z.literal("")]).default(""),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format hex, contoh #1a56db"),
});

export type ProfileState = { error?: string; success?: boolean };

export async function updateOrgProfile(
  orgSlug: string,
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const membership = await requireMembership(orgSlug);
  if (!canAdmin(membership.role)) {
    return { error: "Hanya Pemilik dan Admin yang bisa mengubah ini." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    about: formData.get("about") ?? "",
    website: formData.get("website") ?? "",
    brandColor: formData.get("brandColor"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      about: parsed.data.about || null,
      website: parsed.data.website || null,
      brand_color: parsed.data.brandColor,
    })
    .eq("id", membership.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}`, "layout");
  revalidatePath(`/karier/${orgSlug}`);
  return { success: true };
}

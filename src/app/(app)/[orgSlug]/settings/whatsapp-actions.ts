"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";

/**
 * Template pesan WhatsApp per tahap.
 *
 * Isinya teks polos, bukan dokumen kaya. WhatsApp tidak mengenal HTML maupun
 * struktur dokumen — apa pun yang ditulis di sini akan terkirim apa adanya
 * sebagai teks, jadi editor kaya hanya akan menyesatkan penulisnya.
 */

const schema = z.object({
  stageName: z
    .string()
    .trim()
    .min(2, "Nama tahap minimal 2 karakter")
    .max(40, "Nama tahap maksimal 40 karakter"),
  body: z
    .string()
    .trim()
    .min(10, "Pesan minimal 10 karakter")
    .max(1000, "Pesan maksimal 1000 karakter"),
});

export type WaTemplateState = { error?: string; success?: boolean };

export async function saveWaTemplate(
  orgSlug: string,
  _prev: WaTemplateState,
  formData: FormData,
): Promise<WaTemplateState> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin mengubah template." };
  }

  const parsed = schema.safeParse({
    stageName: formData.get("stageName"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();
  /* Upsert, bukan insert-atau-update terpisah: unique (org_id, stage_name)
     sudah menjamin satu template per tahap, jadi biarkan database yang
     memutuskan ini baris baru atau lama. */
  const { error } = await supabase.from("whatsapp_templates").upsert(
    {
      org_id: membership.org.id,
      stage_name: parsed.data.stageName,
      body: parsed.data.body,
    },
    { onConflict: "org_id,stage_name" },
  );

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: true };
}

export async function deleteWaTemplate(
  orgSlug: string,
  _prev: WaTemplateState,
  formData: FormData,
): Promise<WaTemplateState> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin menghapus template." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Template tidak dikenal." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("whatsapp_templates")
    .delete()
    .eq("id", id)
    .eq("org_id", membership.org.id);

  if (error) return { error: error.message };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: true };
}

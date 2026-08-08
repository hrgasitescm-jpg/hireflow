"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createOrgSchema } from "@/lib/validation";

export type OrgState = { error?: string };

export async function createOrganization(
  _prev: OrgState,
  formData: FormData,
): Promise<OrgState> {
  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }

  const supabase = await createClient();

  // RPC SECURITY DEFINER: membuat organisasi + membership owner +
  // data awal dalam satu transaksi. Lihat migrasi 0003.
  const { data, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(`/${data.slug}/dashboard`);
}

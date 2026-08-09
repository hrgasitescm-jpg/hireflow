import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/job-form";
import { createJob, type JobState } from "../actions";

export const metadata: Metadata = { title: "Buat lowongan" };

export default async function NewJobPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) redirect(`/${orgSlug}/jobs`);

  const supabase = await createClient();
  const [departments, locations, workModes] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("org_id", membership.org.id)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name")
      .eq("org_id", membership.org.id)
      .order("name"),
    supabase
      .from("work_modes")
      .select("id, name")
      .eq("org_id", membership.org.id)
      .order("position"),
  ]);

  async function action(prev: JobState, formData: FormData) {
    "use server";
    return createJob(orgSlug, prev, formData);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Buat lowongan"
        description="Lowongan disimpan sebagai draf sampai kamu menerbitkannya."
      />
      <JobForm
        action={action}
        departments={departments.data ?? []}
        locations={locations.data ?? []}
        workModes={workModes.data ?? []}
        cancelHref={`/${orgSlug}/jobs`}
        submitLabel="Simpan lowongan"
        showPublishToggle
      />
    </div>
  );
}

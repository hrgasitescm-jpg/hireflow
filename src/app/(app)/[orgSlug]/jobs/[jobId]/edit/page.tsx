import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { JobForm } from "@/components/job-form";
import { updateJob, type JobState } from "../../actions";

export const metadata: Metadata = { title: "Ubah lowongan" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) redirect(`/${orgSlug}/jobs`);

  const supabase = await createClient();
  const [jobRes, departments, locations] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
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
  ]);

  const job = jobRes.data;
  if (!job) notFound();

  async function action(prev: JobState, formData: FormData) {
    "use server";
    return updateJob(orgSlug, jobId, prev, formData);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Ubah lowongan" description={job.title} />
      <JobForm
        action={action}
        departments={departments.data ?? []}
        locations={locations.data ?? []}
        cancelHref={`/${orgSlug}/jobs/${jobId}/pipeline`}
        submitLabel="Simpan perubahan"
        initialValues={{
          title: job.title,
          slug: job.slug,
          departmentId: job.department_id ?? "",
          locationId: job.location_id ?? "",
          workMode: job.work_mode,
          employmentType: job.employment_type,
          description: job.description,
          requirements: job.requirements,
          benefits: job.benefits,
          requiredSkills: job.required_skills.join(", "),
          minYearsExp: job.min_years_exp?.toString() ?? "",
          salaryMin: job.salary_min?.toString() ?? "",
          salaryMax: job.salary_max?.toString() ?? "",
          salaryVisible: job.salary_visible,
          openings: job.openings,
        }}
      />
    </div>
  );
}

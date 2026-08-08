"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMembership, canManage } from "@/lib/auth";
import { jobSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

export type JobState = { error?: string };

function parseSkills(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function readJobForm(formData: FormData) {
  const emptyToNull = (v: FormDataEntryValue | null) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s === "" ? null : s;
  };

  return jobSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") || slugify(String(formData.get("title") ?? "")),
    departmentId: formData.get("departmentId") ?? "",
    locationId: formData.get("locationId") ?? "",
    workMode: formData.get("workMode"),
    employmentType: formData.get("employmentType"),
    description: formData.get("description") ?? "",
    requirements: formData.get("requirements") ?? "",
    benefits: formData.get("benefits") ?? "",
    requiredSkills: formData.get("requiredSkills") ?? "",
    minYearsExp: emptyToNull(formData.get("minYearsExp")),
    salaryMin: emptyToNull(formData.get("salaryMin")),
    salaryMax: emptyToNull(formData.get("salaryMax")),
    salaryVisible: formData.get("salaryVisible") === "on",
    openings: formData.get("openings") || 1,
  });
}

export async function createJob(
  orgSlug: string,
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin membuat lowongan." };
  }

  const parsed = readJobForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      org_id: membership.org.id,
      slug: v.slug,
      title: v.title,
      department_id: v.departmentId || null,
      location_id: v.locationId || null,
      work_mode: v.workMode,
      employment_type: v.employmentType,
      description: v.description,
      requirements: v.requirements,
      benefits: v.benefits,
      required_skills: parseSkills(v.requiredSkills),
      min_years_exp: v.minYearsExp ?? null,
      salary_min: v.salaryMin ?? null,
      salary_max: v.salaryMax ?? null,
      salary_visible: v.salaryVisible,
      openings: v.openings,
      status: formData.get("publish") === "on" ? "published" : "draft",
      published_at: formData.get("publish") === "on" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `Slug "${v.slug}" sudah dipakai lowongan lain.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/${orgSlug}/jobs`);
  revalidatePath(`/karier/${orgSlug}`);
  redirect(`/${orgSlug}/jobs/${data.id}/pipeline`);
}

export async function updateJob(
  orgSlug: string,
  jobId: string,
  _prev: JobState,
  formData: FormData,
): Promise<JobState> {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) {
    return { error: "Kamu tidak punya izin mengubah lowongan." };
  }

  const parsed = readJobForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      slug: v.slug,
      title: v.title,
      department_id: v.departmentId || null,
      location_id: v.locationId || null,
      work_mode: v.workMode,
      employment_type: v.employmentType,
      description: v.description,
      requirements: v.requirements,
      benefits: v.benefits,
      required_skills: parseSkills(v.requiredSkills),
      min_years_exp: v.minYearsExp ?? null,
      salary_min: v.salaryMin ?? null,
      salary_max: v.salaryMax ?? null,
      salary_visible: v.salaryVisible,
      openings: v.openings,
    })
    .eq("id", jobId)
    .eq("org_id", membership.org.id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Slug "${v.slug}" sudah dipakai lowongan lain.` };
    }
    return { error: error.message };
  }

  revalidatePath(`/${orgSlug}/jobs`);
  revalidatePath(`/karier/${orgSlug}`);
  redirect(`/${orgSlug}/jobs/${jobId}/pipeline`);
}

const ALLOWED_STATUS = [
  "draft",
  "published",
  "on_hold",
  "closed",
  "archived",
] as const;

export async function setJobStatus(
  orgSlug: string,
  jobId: string,
  status: (typeof ALLOWED_STATUS)[number],
) {
  const membership = await requireMembership(orgSlug);
  if (!canManage(membership.role)) return;
  if (!ALLOWED_STATUS.includes(status)) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("org_id", membership.org.id);

  revalidatePath(`/${orgSlug}/jobs`);
  revalidatePath(`/${orgSlug}/jobs/${jobId}/pipeline`);
  revalidatePath(`/karier/${orgSlug}`);
}

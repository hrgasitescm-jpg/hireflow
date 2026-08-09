import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Query untuk halaman publik (career page).
 *
 * Memakai service role karena pembacanya anonim dan tidak punya sesi.
 * Aman karena setiap fungsi di sini:
 *   1. memfilter status = 'published' secara eksplisit, dan
 *   2. hanya memilih kolom yang memang layak publik.
 *
 * Jangan menambah fungsi di file ini yang mengembalikan data kandidat.
 */

export type PublicOrg = {
  id: string;
  slug: string;
  name: string;
  about: string | null;
  logo_url: string | null;
  website: string | null;
  brand_color: string;
};

export const getPublicOrg = cache(
  async (slug: string): Promise<PublicOrg | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("organizations")
      .select("id, slug, name, about, logo_url, website, brand_color")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    return data;
  },
);

export const getPublicJobs = cache(async (orgId: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      `id, slug, title, work_mode, employment_type, salary_min, salary_max,
       salary_visible, published_at, departments(name), locations(name)`,
    )
    .eq("org_id", orgId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return data ?? [];
});

export const getPublicJob = cache(async (orgId: string, jobSlug: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("jobs")
    .select(
      `id, slug, title, description, requirements, benefits, work_mode,
       employment_type, salary_min, salary_max, salary_visible, salary_currency,
       openings, published_at, closes_at, departments(name), locations(name, country)`,
    )
    .eq("org_id", orgId)
    .eq("slug", jobSlug)
    .eq("status", "published")
    .maybeSingle();
  return data;
});

export const getJobQuestions = cache(async (jobId: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("job_questions")
    .select("id, label, help_text, type, options, required")
    .eq("job_id", jobId)
    .order("position");
  return data ?? [];
});

/**
 * Nama mode kerja yang ditandai jarak jauh.
 *
 * Dipakai untuk data terstruktur Google Jobs: jobLocationType TELECOMMUTE
 * hanya boleh dipasang pada lowongan yang benar-benar jarak jauh. Dulu ini
 * cukup dibandingkan dengan kode 'remote', tapi mode kerja kini dikelola tiap
 * organisasi sendiri sehingga namanya bisa apa saja.
 */
export const getRemoteWorkModes = cache(async (orgId: string) => {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("work_modes")
    .select("name")
    .eq("org_id", orgId)
    .eq("is_remote", true);
  return new Set((data ?? []).map((r) => r.name));
});

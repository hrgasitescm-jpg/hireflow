import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireMembership, canManage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { JobForm } from "@/components/job-form";
import { updateJob, type JobState } from "../../actions";
import { StageManager } from "../stage-manager";
import { QuestionManager } from "../question-manager";

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
  const [jobRes, departments, locations, stagesRes, questionsRes] =
    await Promise.all([
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
    supabase
      .from("job_stages")
      .select("id, name, position, kind")
      .eq("job_id", jobId)
      .order("position"),
    supabase
      .from("job_questions")
      .select("id, label, help_text, type, required, position")
      .eq("job_id", jobId)
      .order("position"),
  ]);

  const job = jobRes.data;
  if (!job) notFound();

  /* Jumlah kandidat per tahap dipakai untuk memberi tahu mengapa sebuah tahap
     tidak bisa dihapus, sebelum pengguna menekan tombolnya dan gagal. */
  const stageList = stagesRes.data ?? [];
  const stageCounts = await Promise.all(
    stageList.map((s) =>
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", s.id),
    ),
  );
  const stages = stageList.map((s, i) => ({
    ...s,
    count: stageCounts[i]?.count ?? 0,
  }));

  const questionList = questionsRes.data ?? [];
  const answerCounts = await Promise.all(
    questionList.map((q) =>
      supabase
        .from("application_answers")
        .select("question_id", { count: "exact", head: true })
        .eq("question_id", q.id),
    ),
  );
  const questions = questionList.map((q, i) => ({
    ...q,
    answerCount: answerCounts[i]?.count ?? 0,
  }));

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

      {/* ------------------------------------------------------------------
          Tahapan pipeline

          Sebelumnya lima tahap bawaan dibuat otomatis oleh trigger database
          dan tidak ada layar mana pun yang bisa mengubahnya — proses
          rekrutmen setiap perusahaan dipaksa mengikuti bentuk yang sama.
          ------------------------------------------------------------------ */}
      <Card className="mt-8 p-5">
        <h2 className="mb-1 text-heading text-ink">Tahapan pipeline</h2>
        <p className="mb-5 text-small text-muted">
          Urutan kolom di papan kandidat. Pelamar baru selalu masuk ke tahap
          paling pertama.
        </p>
        <StageManager orgSlug={orgSlug} jobId={jobId} stages={stages} />
      </Card>

      {/* ------------------------------------------------------------------
          Pertanyaan screening

          Form lamaran publik sudah lama merender pertanyaan dari tabel ini,
          tapi tidak ada layar yang bisa membuatnya — dan aksi kirim lamaran
          bahkan tidak membaca jawabannya. Keduanya diperbaiki bersamaan.
          ------------------------------------------------------------------ */}
      <Card className="mt-8 p-5">
        <h2 className="mb-1 text-heading text-ink">Pertanyaan screening</h2>
        <p className="mb-5 text-small text-muted">
          Ditanyakan ke pelamar di form lamaran. Jawabannya muncul di profil
          kandidat.
        </p>
        <QuestionManager
          orgSlug={orgSlug}
          jobId={jobId}
          questions={questions}
        />
      </Card>
    </div>
  );
}

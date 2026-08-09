"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { JobState } from "@/app/(app)/[orgSlug]/jobs/actions";
import {
  Alert,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  buttonClass,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { slugify } from "@/lib/utils";
import type { Tables } from "@/lib/database.types";

type Option = Pick<Tables<"departments">, "id" | "name">;

export type JobFormValues = {
  title: string;
  slug: string;
  departmentId: string;
  locationId: string;
  workMode: string;
  employmentType: string;
  description: string;
  requirements: string;
  benefits: string;
  requiredSkills: string;
  minYearsExp: string;
  salaryMin: string;
  salaryMax: string;
  salaryVisible: boolean;
  openings: number;
};

const EMPTY: JobFormValues = {
  title: "",
  slug: "",
  departmentId: "",
  locationId: "",
  workMode: "onsite",
  employmentType: "full_time",
  description: "",
  requirements: "",
  benefits: "",
  requiredSkills: "",
  minYearsExp: "",
  salaryMin: "",
  salaryMax: "",
  salaryVisible: false,
  openings: 1,
};

export function JobForm({
  action,
  departments,
  locations,
  workModes,
  initialValues,
  cancelHref,
  submitLabel,
  showPublishToggle = false,
}: {
  action: (prev: JobState, formData: FormData) => Promise<JobState>;
  departments: Option[];
  workModes: Option[];
  locations: Option[];
  initialValues?: Partial<JobFormValues>;
  cancelHref: string;
  submitLabel: string;
  showPublishToggle?: boolean;
}) {
  const values = { ...EMPTY, ...initialValues };
  const [state, formAction] = useActionState(action, {} as JobState);
  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(values.slug));

  const effectiveSlug = slugTouched ? slug : slugify(title);

  return (
    <form action={formAction} className="space-y-6">
      <Card className="space-y-5 p-5">
        <h2 className="text-heading text-ink">Informasi dasar</h2>

        <Field label="Judul lowongan" htmlFor="title" required>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Backend Engineer (Golang)"
          />
        </Field>

        <Field
          label="Slug URL"
          htmlFor="slug"
          hint="Bagian akhir alamat halaman lowongan. Ubah hanya jika perlu."
          required
        >
          <Input
            id="slug"
            name="slug"
            required
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Departemen" htmlFor="departmentId">
            <Select
              id="departmentId"
              name="departmentId"
              defaultValue={values.departmentId}
            >
              <option value="">— Tidak ditentukan —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Lokasi" htmlFor="locationId">
            <Select
              id="locationId"
              name="locationId"
              defaultValue={values.locationId}
            >
              <option value="">— Tidak ditentukan —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Mode kerja" htmlFor="workMode" required>
            <Select id="workMode" name="workMode" defaultValue={values.workMode}>
              {workModes.length === 0 && (
                <option value="">— Belum ada mode kerja —</option>
              )}
              {workModes.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipe pekerjaan" htmlFor="employmentType" required>
            <Select
              id="employmentType"
              name="employmentType"
              defaultValue={values.employmentType}
            >
              <option value="full_time">Penuh waktu</option>
              <option value="part_time">Paruh waktu</option>
              <option value="contract">Kontrak</option>
              <option value="internship">Magang</option>
              <option value="freelance">Lepas</option>
            </Select>
          </Field>

          <Field label="Jumlah slot" htmlFor="openings" required>
            <Input
              id="openings"
              name="openings"
              type="number"
              min={1}
              max={999}
              defaultValue={values.openings}
            />
          </Field>

          <Field
            label="Minimal pengalaman (tahun)"
            htmlFor="minYearsExp"
            hint="Kosongkan bila tidak ada syarat."
          >
            <Input
              id="minYearsExp"
              name="minYearsExp"
              type="number"
              min={0}
              max={50}
              step="0.5"
              defaultValue={values.minYearsExp}
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-heading text-ink">Detail posisi</h2>

        <Field
          label="Deskripsi pekerjaan"
          htmlFor="description"
          hint="Jelaskan tanggung jawab utama dan konteks tim."
        >
          <Textarea
            id="description"
            name="description"
            rows={7}
            defaultValue={values.description}
            placeholder="Kamu akan bertanggung jawab atas…"
          />
        </Field>

        <Field label="Kualifikasi" htmlFor="requirements">
          <Textarea
            id="requirements"
            name="requirements"
            rows={6}
            defaultValue={values.requirements}
            placeholder="- Minimal 3 tahun pengalaman…"
          />
        </Field>

        <Field label="Benefit" htmlFor="benefits">
          <Textarea
            id="benefits"
            name="benefits"
            rows={4}
            defaultValue={values.benefits}
            placeholder="- BPJS Kesehatan & Ketenagakerjaan…"
          />
        </Field>

        <Field
          label="Skill yang dibutuhkan"
          htmlFor="requiredSkills"
          hint="Pisahkan dengan koma. Dipakai untuk pencocokan kandidat nanti."
        >
          <Input
            id="requiredSkills"
            name="requiredSkills"
            defaultValue={values.requiredSkills}
            placeholder="Golang, PostgreSQL, Docker"
          />
        </Field>
      </Card>

      <Card className="space-y-5 p-5">
        <h2 className="text-heading text-ink">Gaji</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gaji minimum (IDR)" htmlFor="salaryMin">
            <Input
              id="salaryMin"
              name="salaryMin"
              type="number"
              min={0}
              step={100000}
              defaultValue={values.salaryMin}
              placeholder="8000000"
            />
          </Field>
          <Field label="Gaji maksimum (IDR)" htmlFor="salaryMax">
            <Input
              id="salaryMax"
              name="salaryMax"
              type="number"
              min={0}
              step={100000}
              defaultValue={values.salaryMax}
              placeholder="15000000"
            />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="salaryVisible"
            defaultChecked={values.salaryVisible}
            className="mt-0.5 size-4 rounded border-line text-gold-700 focus:ring-gold-400"
          />
          <span>
            Tampilkan rentang gaji di halaman lowongan publik
            <span className="mt-0.5 block text-caption text-muted">
              Lowongan yang mencantumkan gaji biasanya mendapat lebih banyak
              pelamar relevan.
            </span>
          </span>
        </label>
      </Card>

      {state.error && <Alert>{state.error}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Menyimpan…">{submitLabel}</SubmitButton>

        {showPublishToggle && (
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="publish"
              className="size-4 rounded border-line text-gold-700 focus:ring-gold-400"
            />
            Langsung terbitkan
          </label>
        )}

        <Link
          href={cancelHref}
          className={buttonClass({ variant: "secondary", className: "ml-auto" })}
        >
          Batal
        </Link>
      </div>
    </form>
  );
}

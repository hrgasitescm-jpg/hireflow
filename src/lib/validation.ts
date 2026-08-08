import { z } from "zod";

/**
 * Satu sumber kebenaran untuk validasi. Skema yang sama dipakai di
 * Server Action (wajib) dan bisa dipakai ulang di klien untuk UX.
 * Aturan: JANGAN PERNAH percaya input klien — selalu parse di server.
 */

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} minimal ${min} karakter`)
    .max(max, `${label} maksimal ${max} karakter`);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Slug minimal 3 karakter")
  .max(50, "Slug maksimal 50 karakter")
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/,
    "Slug hanya boleh huruf kecil, angka, dan tanda hubung",
  );

// ---------------- Auth ----------------

export const credentialsSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(72),
});

export const registerSchema = credentialsSchema.extend({
  fullName: trimmed(2, 80, "Nama"),
});

// ---------------- Organisasi ----------------

export const createOrgSchema = z.object({
  name: trimmed(2, 80, "Nama organisasi"),
  slug: slugSchema,
});

export const inviteMemberSchema = z.object({
  email: z.email("Format email tidak valid"),
  role: z.enum([
    "admin",
    "recruiter",
    "hiring_manager",
    "interviewer",
    "agency",
    "viewer",
  ]),
});

// ---------------- Job ----------------

export const jobSchema = z
  .object({
    title: trimmed(3, 120, "Judul lowongan"),
    slug: slugSchema,
    departmentId: z.union([z.uuid(), z.literal("")]).optional(),
    locationId: z.union([z.uuid(), z.literal("")]).optional(),
    workMode: z.enum(["onsite", "hybrid", "remote"]),
    employmentType: z.enum([
      "full_time",
      "part_time",
      "contract",
      "internship",
      "freelance",
    ]),
    description: z.string().trim().max(20000).default(""),
    requirements: z.string().trim().max(20000).default(""),
    benefits: z.string().trim().max(10000).default(""),
    requiredSkills: z.string().trim().max(1000).default(""),
    minYearsExp: z.coerce.number().min(0).max(50).nullable().optional(),
    salaryMin: z.coerce.number().int().min(0).max(1e12).nullable().optional(),
    salaryMax: z.coerce.number().int().min(0).max(1e12).nullable().optional(),
    salaryVisible: z.coerce.boolean().default(false),
    openings: z.coerce.number().int().min(1).max(999).default(1),
  })
  .refine(
    (v) =>
      v.salaryMin == null || v.salaryMax == null || v.salaryMax >= v.salaryMin,
    { message: "Gaji maksimum harus ≥ gaji minimum", path: ["salaryMax"] },
  );

export type JobInput = z.infer<typeof jobSchema>;

// ---------------- Lamaran (publik) ----------------

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

export const applicationSchema = z.object({
  fullName: trimmed(2, 100, "Nama lengkap"),
  email: z.email("Format email tidak valid").max(255),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Format nomor telepon tidak valid")
    .max(20),
  locationText: z.string().trim().max(120).optional().default(""),
  linkedinUrl: z
    .union([z.url("URL LinkedIn tidak valid"), z.literal("")])
    .optional(),
  portfolioUrl: z
    .union([z.url("URL portofolio tidak valid"), z.literal("")])
    .optional(),
  yearsExp: z.coerce.number().min(0).max(60).optional(),
  coverLetter: z.string().trim().max(5000).optional().default(""),
  consent: z
    .literal("on", { message: "Persetujuan pemrosesan data wajib dicentang" }),
  // Honeypot: bot mengisi field tersembunyi ini, manusia tidak.
  website: z.string().max(0, "Terdeteksi sebagai bot").optional().default(""),
});

// ---------------- Kolaborasi ----------------

export const noteSchema = z.object({
  applicationId: z.uuid(),
  body: trimmed(1, 5000, "Catatan"),
});

export const moveStageSchema = z.object({
  applicationId: z.uuid(),
  stageId: z.uuid(),
});

export const decisionSchema = z.object({
  applicationId: z.uuid(),
  status: z.enum(["active", "hired", "rejected", "withdrawn", "on_hold"]),
  reason: z.string().trim().max(500).optional().default(""),
});

// ---------------- Upload ----------------

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function validateResume(file: File | null): string | null {
  if (!file || file.size === 0) return "CV wajib diunggah";
  if (file.size > MAX_RESUME_BYTES) return "Ukuran CV maksimal 5 MB";
  if (!ALLOWED_RESUME_TYPES.includes(file.type as never)) {
    return "Format CV harus PDF atau DOC/DOCX";
  }
  return null;
}

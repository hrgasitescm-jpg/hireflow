import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Backend Engineer (Golang)" -> "backend-engineer-golang" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function formatIDR(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  visible: boolean,
): string | null {
  if (!visible || (min == null && max == null)) return null;
  if (min != null && max != null) return `${formatIDR(min)} – ${formatIDR(max)}`;
  return formatIDR(min ?? max);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** "3 hari lalu", "baru saja" */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  return `${Math.floor(months / 12)} tahun lalu`;
}

/** Normalisasi nomor Indonesia ke E.164: 08123... -> +628123... */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Kode mode kerja lama, dari masa nilainya dikunci di database.
 * Lowongan baru menyimpan labelnya langsung, jadi peta ini hanya menerjemahkan
 * data lama yang belum sempat dimigrasikan.
 */
const LEGACY_WORK_MODE: Record<string, string> = {
  onsite: "Di kantor",
  hybrid: "Hybrid",
  remote: "Remote",
};

export function workModeLabel(value: string | null | undefined): string {
  if (!value) return "-";
  return LEGACY_WORK_MODE[value] ?? value;
}

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Penuh waktu",
  part_time: "Paruh waktu",
  contract: "Kontrak",
  internship: "Magang",
  freelance: "Lepas",
};

export const JOB_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  pending_approval: "Menunggu persetujuan",
  approved: "Disetujui",
  published: "Terbit",
  on_hold: "Ditahan",
  closed: "Ditutup",
  archived: "Diarsipkan",
};

export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  hired: "Diterima",
  rejected: "Ditolak",
  withdrawn: "Mengundurkan diri",
  on_hold: "Ditahan",
};

export const ROLE_LABEL: Record<string, string> = {
  owner: "Pemilik",
  admin: "Admin",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
  interviewer: "Interviewer",
  agency: "Agency",
  viewer: "Pengamat",
};

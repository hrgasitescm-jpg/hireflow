import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Button
   --------------------------------------------------------------------------
   Aksi utama tetap ink, bukan emas — emas di atas putih kontrasnya 1.7:1.
   Tapi varian `gold` sekarang layak dipakai: emas dengan teks ink mencapai
   ~10:1, jadi aman, dan itulah cara merek muncul di momen-momen penting
   seperti tombol lamar di career page.
   ========================================================================== */

const BUTTON_VARIANTS = {
  primary:
    "bg-ink text-white shadow-xs hover:bg-ink-soft active:bg-ink",
  secondary:
    "bg-surface text-ink shadow-xs ring-1 ring-inset ring-line hover:bg-line-soft hover:ring-line-strong active:bg-line",
  ghost: "text-ink-soft hover:bg-line-soft hover:text-ink",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-700",
  gold: "bg-gold-400 text-ink shadow-xs hover:bg-gold-300 active:bg-gold-500",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-10 gap-2 px-4 text-[0.875rem]",
  lg: "h-12 gap-2.5 px-6 text-[0.9375rem]",
} as const;

type ButtonBaseProps = {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: ButtonBaseProps & { className?: string } = {}) {
  return cn(
    "inline-flex select-none items-center justify-center rounded-control",
    "font-semibold tracking-[-0.01em] whitespace-nowrap",
    "transition-[background-color,box-shadow,transform] duration-150",
    /* Tekanan halus saat diklik — memberi rasa fisik tanpa animasi berlebihan */
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonBaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass({ variant, size, className })} {...props} />
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonBaseProps & React.ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props} />
  );
}

/* ==========================================================================
   Form controls
   --------------------------------------------------------------------------
   Tinggi naik dari 38px ke 40px dan teks dari 13.5px ke 14px. Isian yang
   pendek dan berteks kecil adalah salah satu penyebab utama antarmuka
   terasa murah, terutama di formulir lamaran yang diisi orang luar.
   ========================================================================== */

const FIELD = cn(
  "block w-full rounded-control border-0 bg-surface px-3.5 text-[0.875rem] text-ink",
  "shadow-xs ring-1 ring-inset ring-line",
  "placeholder:text-subtle",
  "transition-shadow duration-150",
  "hover:ring-line-strong",
  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink",
  "disabled:cursor-not-allowed disabled:bg-line-soft disabled:text-muted",
);

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(FIELD, "min-h-28 py-2.5 leading-relaxed", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD, "h-10 pr-9", className)} {...props} />;
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-[5px] border-line-strong text-ink",
        "focus:ring-2 focus:ring-gold-400 focus:ring-offset-0",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-[0.8125rem] font-semibold text-ink-soft"
      >
        {label}
        {required && (
          <span className="ml-1 text-gold-700" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="text-caption leading-relaxed text-muted">{hint}</p>
      )}
      {error && (
        <p className="text-caption font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
   Surfaces
   --------------------------------------------------------------------------
   Versi lama melarang bayangan sama sekali. Hasilnya seluruh antarmuka
   duduk di satu bidang dan terbaca seperti wireframe. Sekarang kartu punya
   shadow-xs — cukup untuk memisahkan dari kanvas, belum cukup untuk
   terlihat melayang. Yang benar-benar melayang (menu, drawer) pakai
   shadow-lg ke atas.
   ========================================================================== */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-surface border border-line bg-surface shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-heading text-ink">{title}</h2>
          {description && (
            <p className="mt-1 text-small text-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Kepala kartu tanpa badan — untuk kartu yang isinya daftar mepet tepi. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-line px-5 py-4",
        className,
      )}
    >
      <h2 className="text-heading text-ink">{title}</h2>
      {action}
    </div>
  );
}

/* ==========================================================================
   Badge
   ========================================================================== */

const BADGE_TONES = {
  neutral: "bg-line-soft text-ink-soft ring-line-strong",
  gold: "bg-gold-50 text-gold-800 ring-gold-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: { tone?: BadgeTone } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5",
        "text-[0.6875rem] font-semibold leading-5 tracking-[0.01em] ring-1 ring-inset",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Titik status kecil — lebih tenang dari badge penuh untuk daftar padat. */
export function Dot({ tone = "neutral" }: { tone?: BadgeTone }) {
  const colors: Record<BadgeTone, string> = {
    neutral: "bg-line-strong",
    gold: "bg-gold-400",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0 rounded-full", colors[tone])}
    />
  );
}

/* ==========================================================================
   Feedback
   ========================================================================== */

export function Alert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: React.ReactNode;
}) {
  if (!children) return null;
  const tones = {
    error: "bg-red-50 text-red-800 ring-red-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    info: "bg-gold-50 text-gold-900 ring-gold-200",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control px-4 py-3 text-small leading-relaxed ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-line-strong bg-line-soft/40 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-surface bg-surface text-gold-600 shadow-xs ring-1 ring-line">
          {icon}
        </div>
      )}
      <h3 className="text-[0.9375rem] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-small leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-label uppercase text-muted">{eyebrow}</p>
        )}
        <h1 className="text-title text-ink">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-body text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/* --------------------------------------------------------------------------
   Stat
   --------------------------------------------------------------------------
   Angka naik dari 26px ke 32px dengan tracking negatif. Statistik adalah
   satu-satunya tempat di aplikasi yang boleh berteriak — kalau angkanya
   tidak lebih besar dari judul kartu, dasbor kehilangan titik fokus.
   -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Menyorot satu angka per layar dengan emas. Jangan lebih dari satu. */
  accent?: boolean;
}) {
  return (
    <div className="px-5 py-5">
      <p className="text-label uppercase text-muted">{label}</p>
      <p
        className={cn(
          "tabular mt-2 text-[2rem] font-semibold leading-none tracking-[-0.03em]",
          accent ? "text-gold-700" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-caption text-muted">{hint}</p>}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Avatar
   --------------------------------------------------------------------------
   Warnanya diturunkan dari nama, bukan seragam abu. Daftar kandidat adalah
   layar terpanjang di aplikasi ini; inisial yang semuanya abu membuat
   daftar itu terbaca seperti satu blok tanpa pijakan mata.

   Palet sengaja dipilih yang berdampingan baik dengan emas, dan setiap
   pasangan teks/latar berkontras di atas 7:1.
   -------------------------------------------------------------------------- */

const AVATAR_TINTS = [
  "bg-amber-100 text-amber-900",
  "bg-emerald-100 text-emerald-900",
  "bg-sky-100 text-sky-900",
  "bg-violet-100 text-violet-900",
  "bg-rose-100 text-rose-900",
  "bg-teal-100 text-teal-900",
] as const;

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

export function Avatar({
  name,
  size = "md",
  muted = false,
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  /** Paksa abu netral — untuk avatar organisasi di sidebar. */
  muted?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[0.625rem]",
    md: "size-9 text-[0.6875rem]",
    lg: "size-12 text-[0.875rem]",
  };
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold uppercase",
        muted
          ? "bg-line-soft text-ink-soft ring-1 ring-inset ring-line"
          : tintFor(name),
        sizes[size],
        className,
      )}
    >
      {letters || "?"}
    </span>
  );
}

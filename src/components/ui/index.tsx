import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Button
   --------------------------------------------------------------------------
   Aksi utama memakai ink (nyaris hitam), bukan emas. Emas di atas putih
   kontrasnya terlalu rendah untuk tombol, dan cepat terlihat murah kalau
   dipakai di mana-mana. Emas disimpan untuk aksen.
   ========================================================================== */

const BUTTON_VARIANTS = {
  primary: "bg-ink text-white hover:bg-ink-soft active:bg-ink",
  secondary:
    "bg-white text-ink ring-1 ring-inset ring-line hover:bg-line-soft active:bg-line",
  ghost: "text-ink-soft hover:bg-line-soft hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
  /* Untuk aksi sekunder yang perlu terasa "brand" tanpa mengorbankan kontras */
  gold: "bg-gold-400 text-ink hover:bg-gold-300 active:bg-gold-500",
} as const;

const BUTTON_SIZES = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-9.5 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-[15px]",
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
    "font-medium transition-colors duration-150",
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
   ========================================================================== */

const FIELD = cn(
  "block w-full rounded-control border-0 bg-white px-3 text-sm text-ink",
  "shadow-none ring-1 ring-inset ring-line",
  "placeholder:text-stone-400",
  "transition-shadow duration-150",
  "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ink",
  "disabled:bg-line-soft disabled:text-muted",
);

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, "h-9.5", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, "min-h-24 py-2", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(FIELD, "h-9.5 pr-8", className)} {...props} />;
}

export function Checkbox({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-[4px] border-line text-ink",
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
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-ink-soft"
      >
        {label}
        {required && (
          <span className="ml-1 text-gold-600" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ==========================================================================
   Surfaces
   --------------------------------------------------------------------------
   Minimalis berarti garis rambut, bukan bayangan. Bayangan hanya untuk
   elemen yang benar-benar melayang (menu, drawer, kartu yang di-drag).
   ========================================================================== */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-surface border border-line bg-white",
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
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[13px] text-muted">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </Card>
  );
}

/* ==========================================================================
   Badge
   ========================================================================== */

const BADGE_TONES = {
  neutral: "bg-line-soft text-ink-soft ring-line",
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
        "inline-flex items-center rounded-full px-2 py-0.5",
        "text-[11px] font-medium leading-5 ring-1 ring-inset",
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
    neutral: "bg-stone-300",
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
    error: "bg-red-50 text-red-800 ring-red-100",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    info: "bg-gold-50 text-gold-900 ring-gold-100",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-control px-3.5 py-2.5 text-[13px] leading-relaxed ring-1 ring-inset",
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
    <div className="flex flex-col items-center justify-center rounded-surface border border-dashed border-line px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[13px] text-muted">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

/** Statistik ringkas tanpa kartu berat — hanya angka besar dan label. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p className="tabular mt-1.5 text-[26px] font-semibold leading-none text-ink">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Inisial dalam lingkaran — konsisten di seluruh aplikasi. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-[11px]",
    lg: "size-12 text-sm",
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
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-line-soft font-semibold uppercase text-ink-soft ring-1 ring-inset ring-line",
        sizes[size],
        className,
      )}
    >
      {letters || "?"}
    </span>
  );
}

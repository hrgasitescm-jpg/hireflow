import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo CKB.
 *
 * `lockup` = mark + wordmark, untuk header dan halaman auth.
 * `mark`   = hanya ikon, untuk avatar, sidebar sempit, dan favicon.
 *
 * Aset di-crop rapat dari logo asli supaya tidak ada padding tak terduga.
 */

export function Logo({
  variant = "lockup",
  className,
  priority = false,
}: {
  variant?: "lockup" | "mark";
  className?: string;
  priority?: boolean;
}) {
  if (variant === "mark") {
    return (
      <Image
        src="/mark-ckb.png"
        alt="CKB"
        width={228}
        height={162}
        priority={priority}
        className={cn("h-7 w-auto", className)}
      />
    );
  }

  return (
    <Image
      src="/logo-ckb.png"
      alt="CKB"
      width={576}
      height={162}
      priority={priority}
      className={cn("h-7 w-auto", className)}
    />
  );
}

/** Logo + label produk, dipakai di sidebar dan halaman auth. */
export function Wordmark({
  className,
  subtitle = "Recruitment",
}: {
  className?: string;
  subtitle?: string | null;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo variant="lockup" className="h-6 w-auto" priority />
      {subtitle && (
        <>
          <span aria-hidden className="h-4 w-px bg-line" />
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            {subtitle}
          </span>
        </>
      )}
    </span>
  );
}

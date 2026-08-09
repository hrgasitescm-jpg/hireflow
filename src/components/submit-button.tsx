"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Tombol submit yang otomatis nonaktif selama Server Action berjalan.
 * Mencegah double-submit tanpa perlu state manual di setiap form.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  /* Tombol yang isinya hanya ikon wajib punya label — tanpa ini pembaca
     layar hanya mendengar "tombol". */
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? "Menyimpan…") : children}
    </Button>
  );
}

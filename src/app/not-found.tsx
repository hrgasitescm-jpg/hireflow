import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo variant="mark" className="h-9 w-auto opacity-90" />
      <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.16em] text-gold-700">
        404
      </p>
      <h1 className="mt-3 text-[24px] font-semibold text-ink">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
        Tautan yang kamu buka mungkin sudah kedaluwarsa, atau kamu tidak punya
        akses ke halaman ini.
      </p>
      <Link href="/" className={buttonClass({ className: "mt-8" })}>
        Kembali ke beranda
      </Link>
    </div>
  );
}

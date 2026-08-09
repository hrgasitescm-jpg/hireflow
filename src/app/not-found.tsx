import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark size={44} />
      <p className="mt-8 text-label uppercase tracking-[0.16em] text-gold-700">
        404
      </p>
      <h1 className="mt-3 text-title text-ink">Halaman tidak ditemukan</h1>
      <p className="mt-3 max-w-sm text-body leading-relaxed text-muted">
        Tautan yang kamu buka mungkin sudah kedaluwarsa, atau kamu tidak punya
        akses ke halaman ini.
      </p>
      <Link href="/" className={buttonClass({ className: "mt-8" })}>
        Kembali ke beranda
      </Link>
    </div>
  );
}

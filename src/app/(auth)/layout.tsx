import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/logo";

const POINTS = [
  "Career page siap pakai dengan alamat sendiri",
  "Pipeline kanban untuk memantau setiap pelamar",
  "Database kandidat yang tidak hilang saat ganti tim",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Panel kiri — hanya tampil di layar lebar */}
      <aside className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent"
        />
        {/* Cahaya emas sangat halus di sudut */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-gold-400/8 blur-3xl"
        />

        <Link href="/" className="relative">
          <Logo variant="lockup" className="h-8 w-auto" priority />
        </Link>

        <div className="relative max-w-sm">
          <h2 className="text-[26px] font-semibold leading-snug tracking-tight text-white">
            Rekrutmen yang rapi,
            <br />
            tanpa spreadsheet.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-[14px] text-stone-300">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-gold-400"
                  aria-hidden
                />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-stone-500">
          © {new Date().getFullYear()} CKB
        </p>
      </aside>

      {/* Kolom form */}
      <main className="flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo variant="lockup" className="h-7 w-auto" priority />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

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
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------------------------
          Panel kiri — hanya tampil di layar lebar.

          Versi lama memakai bidang ink polos, dan bidang gelap sebesar itu
          tanpa apa-apa di dalamnya justru terbaca seperti halaman yang belum
          selesai. Kelas .panel-ink menambahkan kisi halus dan cahaya emas di
          sudut: cukup untuk memberi tekstur, masih cukup tenang untuk tidak
          bersaing dengan formulir di sebelahnya.
          ------------------------------------------------------------------ */}
      <aside className="panel-ink relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div aria-hidden className="rule-gold absolute inset-x-0 top-0 h-px" />

        <Link href="/" className="relative w-fit">
          <Logo size="lg" priority />
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-display text-white">
            Rekrutmen yang rapi,
            <br />
            tanpa spreadsheet.
          </h2>
          <p className="mt-5 text-body leading-relaxed text-stone-400">
            Satu tempat untuk lowongan, pelamar, dan setiap keputusan yang
            diambil tim kamu.
          </p>

          <ul className="mt-10 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3.5">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gold-400/15 ring-1 ring-inset ring-gold-400/25"
                >
                  <Check className="size-3 text-gold-400" />
                </span>
                <span className="text-body text-stone-300">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-caption text-stone-500">
          © {new Date().getFullYear()} HireFlow
        </p>
      </aside>

      {/* Kolom formulir */}
      <main className="flex min-h-screen flex-col justify-center bg-surface px-6 py-14 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-12 inline-block lg:hidden">
            <Logo size="md" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

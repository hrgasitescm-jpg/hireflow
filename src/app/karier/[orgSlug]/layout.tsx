import { notFound } from "next/navigation";
import { getPublicOrg } from "@/lib/public-data";

/**
 * Dirender per permintaan, bukan ISR.
 *
 * ISR di Cloudflare Workers menuntut binding tambahan — R2 untuk incremental
 * cache dan Durable Object sebagai antrean revalidasi — sementara SSR jalan
 * tanpa konfigurasi apa pun. Untuk career page satu perusahaan yang trafiknya
 * kecil, selisih kecepatannya tidak sepadan dengan biaya dan kerumitannya.
 */
export const dynamic = "force-dynamic";

export default async function CareerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getPublicOrg(orgSlug);
  if (!org) notFound();

  const name = org.name.trim();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      {/* Garis emas tipis di paling atas — satu-satunya ornamen */}
      <div aria-hidden className="rule-gold h-px" />

      {/* Header sengaja tidak di sini — lihat career-header.tsx.
         Halaman daftar lowongan memakai poster perusahaan sebagai hero,
         dan poster itu sudah memuat logo serta nama. Header di layout
         membuat logo muncul dua kali berturut-turut. */}

      <main className="flex-1">{children}</main>

      {/* ----------------------------------------------------------------
          Footer

          Sebelumnya berisi "Didukung oleh HireFlow". Untuk aplikasi yang
          dipakai satu perusahaan, itu mengiklankan produk yang bukan produk —
          dan bagi pelamar justru menimbulkan pertanyaan siapa HireFlow.
          Sekarang footernya milik perusahaan sendiri.
          ---------------------------------------------------------------- */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 text-center">
          <p className="text-small font-medium text-ink-soft">{name}</p>
          <p className="text-caption text-muted">
            © {new Date().getFullYear()}
            {org.website && (
              <>
                {" · "}
                <a
                  href={org.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-ink"
                >
                  Situs perusahaan
                </a>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}

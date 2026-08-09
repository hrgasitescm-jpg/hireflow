import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicOrg } from "@/lib/public-data";
import { LogoMark } from "@/components/logo";

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

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href={`/karier/${org.slug}`}
            className="flex min-w-0 items-center gap-3"
          >
            {/* Logo yang diunggah lewat Pengaturan didahulukan. Kalau belum
                ada, pakai logo CKB dari aset — bukan bulatan inisial, karena
                aplikasi ini memang milik satu perusahaan dan logonya ada. */}
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt=""
                className="size-9 rounded-control object-cover ring-1 ring-line"
              />
            ) : (
              <LogoMark size={34} />
            )}
            <span className="truncate text-heading text-ink">{name}</span>
          </Link>

          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden shrink-0 text-small font-medium text-muted transition-colors hover:text-ink sm:block"
            >
              Situs perusahaan
            </a>
          )}
        </div>
      </header>

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

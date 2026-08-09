import Link from "next/link";
import { LogoMark } from "@/components/logo";

/**
 * Header career page.
 *
 * Sengaja TIDAK diletakkan di layout. Halaman daftar lowongan memakai poster
 * perusahaan sebagai hero, dan poster itu sudah memuat logo, nama, serta
 * tagline — header di atasnya membuat logo muncul dua kali berturut-turut.
 *
 * Dengan header sebagai komponen, tiap halaman memutuskan sendiri: halaman
 * daftar melewatinya, halaman detail lowongan memakainya karena di sana tidak
 * ada poster yang membawa identitas.
 */
export function CareerHeader({
  org,
}: {
  org: { slug: string; name: string; logo_url: string | null; website: string | null };
}) {
  const name = org.name.trim();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
        <Link
          href={`/karier/${org.slug}`}
          className="flex min-w-0 items-center gap-3"
        >
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
  );
}

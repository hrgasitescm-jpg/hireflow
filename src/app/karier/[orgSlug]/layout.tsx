import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicOrg } from "@/lib/public-data";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/logo";

export const revalidate = 60;

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

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Garis emas tipis di paling atas — satu-satunya ornamen */}
      <div aria-hidden className="rule-gold h-px" />

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href={`/karier/${org.slug}`}
            className="flex min-w-0 items-center gap-3"
          >
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt=""
                className="size-8 rounded-control object-cover ring-1 ring-line"
              />
            ) : (
              <Avatar name={org.name} size="sm" />
            )}
            <span className="truncate text-[15px] font-semibold text-ink">
              {org.name}
            </span>
          </Link>

          {org.website && (
            <a
              href={org.website}
              target="_blank"
              rel="noreferrer noopener"
              className="hidden shrink-0 text-[13px] text-muted hover:text-ink sm:block"
            >
              Situs perusahaan
            </a>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-6">
          <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">
            Didukung oleh
          </span>
          <Logo variant="lockup" className="h-5 w-auto opacity-70" />
        </div>
      </footer>
    </div>
  );
}

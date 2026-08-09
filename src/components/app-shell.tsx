"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutGrid,
  Users,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  LogOut,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { cn, ROLE_LABEL } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/logo";
import type { Membership } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "jobs", label: "Lowongan", icon: Briefcase },
  { href: "candidates", label: "Kandidat", icon: Users },
  { href: "settings", label: "Pengaturan", icon: Settings },
] as const;

export function AppShell({
  membership,
  memberships,
  children,
}: {
  membership: Membership;
  memberships: Membership[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const base = `/${membership.org.slug}`;
  const multiOrg = memberships.length > 1;
  /* Nama organisasi di database bisa membawa spasi berlebih dari formulir.
     Dibersihkan saat tampil supaya tidak muncul celah aneh di sebelah nama. */
  const orgName = membership.org.name.trim();

  const sidebar = (
    <div className="flex h-full flex-col bg-surface">
      <div className="px-5 pt-6 pb-5">
        <Link
          href={`${base}/dashboard`}
          onClick={() => setMobileOpen(false)}
          className="inline-block"
        >
          {/* 32px, bukan 24px: wordmark emas di atas sidebar putih terlalu
              pucat pada ukuran kecil. Diuji dengan render langsung. */}
          <Logo size="lg" priority />
        </Link>
      </div>

      {/* ------------------------------------------------------------------
          Identitas organisasi

          Aplikasi ini dipakai satu perusahaan, jadi pemilih organisasi hanya
          muncul kalau user memang anggota lebih dari satu. Dengan satu
          organisasi, tombol yang tidak bisa menuju ke mana-mana justru
          membuat pengguna mengira ada sesuatu yang belum jalan.
          ------------------------------------------------------------------ */}
      <div className="relative px-3">
        {multiOrg ? (
          <>
            <button
              type="button"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-expanded={switcherOpen}
              aria-haspopup="menu"
              className={cn(
                "flex w-full items-center gap-2.5 rounded-control bg-surface px-2.5 py-2.5 text-left",
                "shadow-xs ring-1 ring-inset ring-line transition-colors",
                "hover:bg-line-soft hover:ring-line-strong",
              )}
            >
              <OrgBadge org={membership.org} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-semibold text-ink">
                  {orgName}
                </span>
                <span className="block text-caption text-muted">
                  {ROLE_LABEL[membership.role]}
                </span>
              </span>
              <ChevronsUpDown
                className="size-3.5 shrink-0 text-subtle"
                aria-hidden
              />
            </button>

            {switcherOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setSwitcherOpen(false)}
                  aria-hidden
                />
                <div
                  role="menu"
                  className="absolute inset-x-3 top-full z-20 mt-2 overflow-hidden rounded-control border border-line bg-surface py-1.5 shadow-lg"
                >
                  {memberships.map((m) => {
                    const current = m.org.id === membership.org.id;
                    return (
                      <Link
                        key={m.org.id}
                        href={`/${m.org.slug}/dashboard`}
                        onClick={() => setSwitcherOpen(false)}
                        role="menuitem"
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 text-small hover:bg-line-soft",
                          current ? "font-semibold text-ink" : "text-ink-soft",
                        )}
                      >
                        <Check
                          className={cn(
                            "size-3.5 shrink-0",
                            current ? "text-gold-600" : "text-transparent",
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{m.org.name.trim()}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2.5 rounded-control bg-line-soft px-2.5 py-2.5">
            <OrgBadge org={membership.org} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-semibold text-ink">
                {orgName}
              </span>
              <span className="block text-caption text-muted">
                {ROLE_LABEL[membership.role]}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------
          Navigasi

          Halaman aktif memakai pil ink terisi, bukan latar abu samar dengan
          garis emas 2px seperti versi lama. Pada sidebar putih, penanda samar
          membuat pengguna harus mencari-cari posisinya sendiri.
          ------------------------------------------------------------------ */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-6">
        {NAV.map(({ href, label, icon: Icon }) => {
          const target = `${base}/${href}`;
          const active = pathname === target || pathname.startsWith(`${target}/`);
          return (
            <Link
              key={href}
              href={target}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-control px-3 py-2.5",
                "text-body font-medium transition-colors",
                active
                  ? "bg-ink font-semibold text-white shadow-xs"
                  : "text-ink-soft hover:bg-line-soft hover:text-ink",
              )}
            >
              <Icon
                className={cn(
                  "size-[1.125rem] shrink-0 transition-colors",
                  active
                    ? "text-gold-400"
                    : "text-subtle group-hover:text-ink-soft",
                )}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-line p-3">
        <a
          href={`/karier/${membership.org.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-control px-3 py-2 text-small text-muted transition-colors hover:bg-line-soft hover:text-ink"
        >
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
          Career page
        </a>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-small text-muted transition-colors hover:bg-line-soft hover:text-ink"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Header mobile */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-md">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="-mr-2 rounded-control p-2 text-ink-soft transition-colors hover:bg-line-soft"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="relative z-10 w-72 max-w-[85%] shadow-xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
                className="absolute top-5 right-3 z-10 rounded-control p-1.5 text-ink-soft transition-colors hover:bg-line-soft"
              >
                <X className="size-5" aria-hidden />
              </button>
              {sidebar}
            </div>
          </div>
        )}
      </div>

      {/* Lebar isi dinaikkan dari 72rem ke 90rem. Di monitor 1900px, versi
          lama hanya memakai sekitar 60% lebar layar — sisanya kanvas kosong
          di kanan-kiri, dan itulah yang membuat tiap halaman terasa lengang
          padahal isinya tidak sedikit. */}
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-[90rem]">{children}</div>
      </main>
    </div>
  );
}

/** Logo yang diunggah lewat Pengaturan, atau mark CKB dari aset. */
function OrgBadge({ org }: { org: Membership["org"] }) {
  if (org.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={org.logo_url}
        alt=""
        className="size-7 shrink-0 rounded-control object-cover ring-1 ring-line"
      />
    );
  }
  return <LogoMark size={26} />;
}

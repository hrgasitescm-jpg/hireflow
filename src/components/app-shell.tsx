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
  Plus,
} from "lucide-react";
import { cn, ROLE_LABEL } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/logo";
import type { Membership } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "dashboard", label: "Dasbor", icon: LayoutGrid },
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

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 pb-5 pt-6">
        <Link href={`${base}/dashboard`} onClick={() => setMobileOpen(false)}>
          <Logo variant="lockup" className="h-6 w-auto" priority />
        </Link>
      </div>

      {/* Pemilih organisasi */}
      <div className="relative px-3">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-expanded={switcherOpen}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-control px-2 py-2 text-left",
            "ring-1 ring-inset ring-line transition-colors hover:bg-line-soft",
          )}
        >
          <Avatar name={membership.org.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {membership.org.name}
            </span>
            <span className="block text-[11px] text-muted">
              {ROLE_LABEL[membership.role]}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-stone-400" aria-hidden />
        </button>

        {switcherOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setSwitcherOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-x-3 top-full z-20 mt-1.5 overflow-hidden rounded-control border border-line bg-white py-1 shadow-lg shadow-stone-900/5">
              {memberships.map((m) => (
                <Link
                  key={m.org.id}
                  href={`/${m.org.slug}/dashboard`}
                  onClick={() => setSwitcherOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-line-soft",
                    m.org.id === membership.org.id
                      ? "font-medium text-ink"
                      : "text-ink-soft",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      m.org.id === membership.org.id
                        ? "bg-gold-400"
                        : "bg-transparent",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{m.org.name}</span>
                </Link>
              ))}
              <Link
                href="/onboarding"
                className="mt-1 flex items-center gap-2 border-t border-line px-3 py-2 text-[13px] text-muted hover:bg-line-soft hover:text-ink"
              >
                <Plus className="size-3.5" aria-hidden />
                Organisasi baru
              </Link>
            </div>
          </>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-5">
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
                "group relative flex items-center gap-3 rounded-control px-3 py-2",
                "text-[13.5px] transition-colors",
                active
                  ? "bg-line-soft font-medium text-ink"
                  : "text-ink-soft hover:bg-line-soft hover:text-ink",
              )}
            >
              {/* Penanda aktif — satu-satunya emas di navigasi */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors",
                  active ? "bg-gold-400" : "bg-transparent",
                )}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-ink" : "text-stone-400 group-hover:text-ink-soft",
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
          className="flex items-center gap-3 rounded-control px-3 py-2 text-[13px] text-muted transition-colors hover:bg-line-soft hover:text-ink"
        >
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
          Career page
        </a>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-control px-3 py-2 text-[13px] text-muted transition-colors hover:bg-line-soft hover:text-ink"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            Keluar
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-line lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Header mobile */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/85 px-4 py-3 backdrop-blur">
          <Logo variant="lockup" className="h-6 w-auto" priority />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
            className="-mr-2 rounded-control p-2 text-ink-soft hover:bg-line-soft"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="relative z-10 w-72 max-w-[85%] border-r border-line">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
                className="absolute right-3 top-5 z-10 rounded-control p-1.5 text-ink-soft hover:bg-line-soft"
              >
                <X className="size-5" aria-hidden />
              </button>
              {sidebar}
            </div>
          </div>
        )}
      </div>

      <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

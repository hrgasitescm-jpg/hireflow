import Link from "next/link";
import type { Metadata } from "next";
import { Users, Search } from "lucide-react";
import { requireMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Kandidat" };

const PAGE_SIZE = 25;

export default async function CandidatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { orgSlug } = await params;
  const { q = "", page = "1" } = await searchParams;
  const membership = await requireMembership(orgSlug);
  const supabase = await createClient();

  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const from = (pageNum - 1) * PAGE_SIZE;

  let query = supabase
    .from("candidates")
    .select("id, full_name, email, headline, skills, years_exp, created_at", {
      count: "exact",
    })
    .eq("org_id", membership.org.id);

  const term = q.trim();
  if (term) {
    // Escape karakter wildcard PostgREST agar input user tidak jadi pola.
    const safe = term.replace(/[%,()]/g, " ");
    query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data: candidates, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Kandidat"
        description={`${total} kandidat dalam database organisasi.`}
      />

      <form className="mb-4 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari nama atau email…"
            className="pl-9"
            aria-label="Cari kandidat"
          />
        </div>
      </form>

      {candidates && candidates.length > 0 ? (
        <>
          <Card className="divide-y divide-line">
            {candidates.map((c) => (
              <Link
                key={c.id}
                href={`/${orgSlug}/candidates/${c.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-line-soft"
              >
                <Avatar name={c.full_name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {c.full_name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {c.headline ?? c.email}
                  </p>
                </div>
                <div className="hidden shrink-0 gap-1 sm:flex">
                  {c.skills.slice(0, 3).map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
                <span className="hidden w-24 shrink-0 text-right text-xs text-stone-400 md:block">
                  {formatDate(c.created_at)}
                </span>
              </Link>
            ))}
          </Card>

          {totalPages > 1 && (
            <nav
              className="mt-4 flex items-center justify-between text-sm"
              aria-label="Navigasi halaman"
            >
              <span className="text-muted">
                Halaman {pageNum} dari {totalPages}
              </span>
              <div className="flex gap-2">
                {pageNum > 1 && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&page=${pageNum - 1}`}
                    className="rounded-control bg-white px-3 py-1.5 ring-1 ring-line hover:bg-line-soft"
                  >
                    Sebelumnya
                  </Link>
                )}
                {pageNum < totalPages && (
                  <Link
                    href={`?q=${encodeURIComponent(q)}&page=${pageNum + 1}`}
                    className="rounded-control bg-white px-3 py-1.5 ring-1 ring-line hover:bg-line-soft"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Users className="size-8" />}
          title={term ? "Tidak ada hasil" : "Belum ada kandidat"}
          description={
            term
              ? `Tidak ada kandidat yang cocok dengan "${term}".`
              : "Kandidat akan muncul di sini setelah ada yang melamar lewat career page."
          }
        />
      )}
    </>
  );
}

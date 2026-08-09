import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/auth";
import { APPLICATION_STATUS_LABEL } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Ekspor kandidat ke CSV.
 *
 * Memakai klien ber-sesi, bukan service role. RLS yang menentukan baris mana
 * yang ikut terekspor — kalau suatu saat ada peran dengan akses terbatas,
 * ekspornya ikut terbatas tanpa perlu logika tambahan di sini.
 */

/** Batas aman. Ekspor tanpa batas bisa menghabiskan memori Worker. */
const MAX_ROWS = 5000;

/**
 * Membungkus satu sel CSV.
 *
 * Sel yang diawali =, +, -, atau @ diberi kutip dan tanda petik satu di depan.
 * Tanpa itu, Excel memperlakukannya sebagai rumus — dan nilai yang berasal
 * dari isian pelamar bisa dipakai menjalankan perintah di komputer orang yang
 * membuka berkasnya. Ini dikenal sebagai CSV injection.
 */
function cell(value: unknown): string {
  if (value == null) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const orgSlug = request.nextUrl.searchParams.get("org");
  if (!orgSlug) {
    return NextResponse.json({ error: "Parameter org wajib" }, { status: 400 });
  }

  const memberships = await getMemberships();
  const membership = memberships.find(
    (m) => m.org.slug.toLowerCase() === orgSlug.toLowerCase(),
  );
  if (!membership) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: candidates, error } = await supabase
    .from("candidates")
    .select(
      "id, full_name, email, phone, location_text, headline, years_exp, skills, linkedin_url, portfolio_url, source, created_at",
    )
    .eq("org_id", membership.org.id)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = candidates ?? [];

  /* Lamaran diambil terpisah lalu digabung di memori. Satu kandidat bisa punya
     beberapa lamaran, dan menggabungkannya lewat embed akan menggandakan baris
     kandidat — orang yang membuka berkas ini mengharapkan satu baris per orang. */
  const ids = rows.map((c) => c.id);
  const { data: apps } = ids.length
    ? await supabase
        .from("applications")
        .select("candidate_id, status, applied_at, jobs!inner(title), job_stages(name)")
        .in("candidate_id", ids)
        .order("applied_at", { ascending: false })
    : { data: [] };

  const byCandidate = new Map<
    string,
    { job: string; stage: string; status: string }[]
  >();
  for (const a of apps ?? []) {
    const job = a.jobs as unknown as { title: string };
    const stage = a.job_stages as unknown as { name: string } | null;
    const list = byCandidate.get(a.candidate_id) ?? [];
    list.push({
      job: job.title,
      stage: stage?.name ?? "-",
      status: APPLICATION_STATUS_LABEL[a.status] ?? a.status,
    });
    byCandidate.set(a.candidate_id, list);
  }

  const header = [
    "Nama",
    "Email",
    "Telepon",
    "Domisili",
    "Headline",
    "Pengalaman (tahun)",
    "Skill",
    "LinkedIn",
    "Portofolio",
    "Sumber",
    "Tanggal masuk",
    "Lowongan dilamar",
    "Tahap",
    "Status",
  ];

  const lines = [header.map(cell).join(",")];
  for (const c of rows) {
    const list = byCandidate.get(c.id) ?? [];
    lines.push(
      [
        c.full_name,
        c.email,
        c.phone,
        c.location_text,
        c.headline,
        c.years_exp,
        (c.skills ?? []).join("; "),
        c.linkedin_url,
        c.portfolio_url,
        c.source,
        c.created_at?.slice(0, 10),
        list.map((a) => a.job).join("; "),
        list.map((a) => a.stage).join("; "),
        list.map((a) => a.status).join("; "),
      ]
        .map(cell)
        .join(","),
    );
  }

  /* BOM di depan supaya Excel di Windows mengenali UTF-8. Tanpa itu, nama
     dengan huruf beraksen dan karakter Indonesia tampil rusak. */
  const csv = "﻿" + lines.join("\r\n");
  const tanggal = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kandidat-${orgSlug}-${tanggal}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

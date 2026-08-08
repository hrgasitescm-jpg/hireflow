import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/auth";

/**
 * Detail tambahan untuk drawer kandidat (catatan + path CV).
 * Sengaja dipisah dari halaman supaya kanban tetap ringan:
 * data ini hanya diambil saat drawer dibuka.
 *
 * Semua query tunduk pada RLS — endpoint ini tidak memakai service role.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
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

  const { data: application } = await supabase
    .from("applications")
    .select("id, candidate_id, org_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || application.org_id !== membership.org.id) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const [notesRes, docRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id, body, created_at, profiles!notes_author_id_fkey(full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("candidate_documents")
      .select("storage_path")
      .eq("candidate_id", application.candidate_id)
      .eq("kind", "resume")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const notes = (notesRes.data ?? []).map((n) => {
    const profile = n.profiles as unknown as { full_name: string } | null;
    return {
      id: n.id,
      body: n.body,
      created_at: n.created_at,
      author: profile?.full_name ?? "Anggota tim",
    };
  });

  return NextResponse.json(
    { notes, resumePath: docRes.data?.storage_path ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

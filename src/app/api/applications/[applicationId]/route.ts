import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/auth";
import { renderWaTemplate, waLink } from "@/lib/whatsapp";

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
    .select(
      "id, candidate_id, org_id, cover_letter, stage_id, status, rejection_reason, rejected_at, jobs!inner(title), candidates!inner(full_name, phone_e164), job_stages(name)",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (!application || application.org_id !== membership.org.id) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const [notesRes, docRes, historyRes] = await Promise.all([
    supabase
      .from("notes")
      .select("id, body, created_at, profiles!notes_author_id_fkey(full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("candidate_documents")
      .select("id")
      .eq("candidate_id", application.candidate_id)
      .eq("kind", "resume")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    /* Riwayat perpindahan tahap. Diisi trigger applications_stage_change sejak
       migrasi pertama, tapi belum pernah dibaca di layar mana pun — recruiter
       tidak punya cara melihat kapan seorang kandidat berpindah dan oleh siapa. */
    supabase
      .from("stage_history")
      .select(
        "id, created_at, from_stage:job_stages!stage_history_from_stage_id_fkey(name), to_stage:job_stages!stage_history_to_stage_id_fkey(name), profiles(full_name)",
      )
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .limit(30),
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

  /* ------------------------------------------------------------------
     Pesan WhatsApp siap kirim

     Disusun di server, bukan di browser, karena template dan nama organisasi
     hanya bisa dibaca lewat RLS di sisi ini. Yang dikirim ke klien cuma nomor
     dan pesan jadi — klien tidak perlu tahu ada tabel template sama sekali.
     ------------------------------------------------------------------ */
  const candidate = application.candidates as unknown as {
    full_name: string;
    phone_e164: string | null;
  };
  const job = application.jobs as unknown as { title: string };
  const stage = application.job_stages as unknown as { name: string } | null;

  let whatsapp: { link: string; stageName: string } | null = null;

  if (candidate.phone_e164 && stage) {
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("body")
      .eq("org_id", membership.org.id)
      .eq("stage_name", stage.name)
      .maybeSingle();

    /* Tanpa template untuk tahap ini, tombolnya tetap muncul dengan sapaan
       seadanya. Menyembunyikan tombolnya akan membuat recruiter mengira
       nomor kandidat tidak ada. */
    const body =
      template?.body ||
      "Halo {nama}, kami dari {perusahaan} ingin menghubungi terkait lamaran kamu untuk posisi {posisi}.";

    const message = renderWaTemplate(body, {
      nama: candidate.full_name,
      posisi: job.title,
      perusahaan: membership.org.name.trim(),
      tahap: stage.name,
    });

    const link = waLink(candidate.phone_e164, message);
    if (link) whatsapp = { link, stageName: stage.name };
  }

  return NextResponse.json(
    {
      notes,
      resumeDocId: docRes.data?.id ?? null,
      coverLetter: application.cover_letter ?? null,
      whatsapp,
      rejection:
        application.status === "rejected"
          ? {
              reason: application.rejection_reason ?? null,
              at: application.rejected_at ?? null,
            }
          : null,
      history: (historyRes.data ?? []).map((h) => {
        const from = h.from_stage as unknown as { name: string } | null;
        const to = h.to_stage as unknown as { name: string } | null;
        const by = h.profiles as unknown as { full_name: string } | null;
        return {
          id: String(h.id),
          at: h.created_at,
          from: from?.name ?? null,
          to: to?.name ?? null,
          by: by?.full_name || null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { driveConfig, fetchResume } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

/**
 * Menyalurkan CV yang tersimpan di Google Drive ke browser recruiter.
 *
 * Berkas Drive tidak punya padanan signed URL berumur pendek seperti Supabase
 * Storage. Pilihannya hanya dua: membuat berkasnya bisa diakses lewat tautan
 * — yang berarti siapa pun yang menerima tautan itu bisa membukanya — atau
 * menjadikan Worker sebagai perantara. Yang kedua dipilih supaya kendali
 * aksesnya tetap milik aplikasi.
 *
 * Izin diperiksa lewat RLS, bukan lewat pemeriksaan manual: query di bawah
 * memakai klien ber-sesi, dan policy candidate_documents_read hanya
 * meloloskan baris milik organisasi tempat user menjadi anggota. Kalau user
 * mengarang ID dokumen, kueri mengembalikan nol baris.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;
  await requireUser();

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("candidate_documents")
    .select("storage_path, file_name, mime_type")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  if (!doc.storage_path.startsWith("gdrive:")) {
    /* Berkas Supabase tidak lewat sini — jalurnya memakai signed URL yang
       jauh lebih murah karena tidak melewati Worker sama sekali. */
    return NextResponse.json(
      { error: "Berkas ini tidak disimpan di Drive" },
      { status: 400 },
    );
  }

  const cfg = driveConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Integrasi Google Drive belum dikonfigurasi." },
      { status: 503 },
    );
  }

  const fileId = doc.storage_path.slice("gdrive:".length);

  let upstream: Response;
  try {
    upstream = await fetchResume(cfg, fileId);
  } catch (err) {
    console.error("Gagal mengambil berkas dari Drive:", err);
    return NextResponse.json(
      { error: "Gagal mengambil berkas dari Google Drive." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Google Drive menolak permintaan (${upstream.status}).` },
      { status: 502 },
    );
  }

  /* Nama unduhan memakai nama berkas asli pelamar, bukan ID Drive — recruiter
     yang mengunduh sepuluh CV tidak seharusnya berakhir dengan sepuluh berkas
     bernama deretan karakter acak. */
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": doc.mime_type ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

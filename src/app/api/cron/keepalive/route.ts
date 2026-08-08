import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Supabase Free mem-pause project setelah 7 hari tanpa aktivitas database.
 * Endpoint ini melakukan satu query murah supaya project tetap "hidup".
 *
 * Panggil dari GitHub Actions (lihat .github/workflows/keepalive.yml)
 * setiap 6 jam dengan header:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    organizations: count ?? 0,
    at: new Date().toISOString(),
  });
}

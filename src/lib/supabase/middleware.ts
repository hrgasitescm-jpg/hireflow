import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * Menyegarkan token sesi Supabase di setiap request dan meneruskan
 * cookie yang diperbarui ke browser. Tanpa ini, sesi user akan
 * kedaluwarsa di tengah pemakaian.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Penting: jangan hapus baris ini. getUser() memvalidasi token ke server
  // Supabase; getSession() saja tidak cukup karena hanya membaca cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

/**
 * Client Supabase untuk Server Component / Server Action / Route Handler.
 * Memakai anon key + sesi user, sehingga SEMUA query tetap tunduk pada RLS.
 * Inilah default yang harus dipakai; createAdminClient() adalah pengecualian.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Dipanggil dari Server Component: penulisan cookie ditangani middleware.
        }
      },
    },
  });
}

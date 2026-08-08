import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env, serviceRoleKey } from "@/lib/env";

/**
 * Client dengan service role — MELEWATI SEMUA RLS.
 *
 * Hanya boleh dipakai untuk dua hal:
 *   1. Merender career page publik (pembaca anonim, data sudah difilter query).
 *   2. Menerima lamaran dari pelamar anonim, SETELAH validasi input.
 *
 * Jangan pernah memakai ini untuk melayani permintaan user yang sudah login —
 * di situ pakai createClient() dari server.ts supaya RLS tetap bekerja.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

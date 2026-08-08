/**
 * Validasi environment variable saat startup, bukan saat request pertama gagal.
 * Salah ketik nama variabel adalah penyebab bug setup nomor satu.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable ${name} belum diisi. ` +
        `Salin .env.example menjadi .env.local lalu isi nilainya.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/**
 * Service role key HANYA boleh dibaca di server.
 * Fungsi terpisah supaya tidak ikut ter-bundle ke browser.
 */
export function serviceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("Service role key tidak boleh diakses dari browser.");
  }
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/**
 * Tautan WhatsApp klik-untuk-chat.
 *
 * Aplikasi tidak mengirim pesan apa pun. Ia hanya menyusun tautan `wa.me`
 * berisi nomor dan pesan yang sudah terisi; recruiter yang menekan kirim di
 * WhatsApp miliknya sendiri.
 *
 * Konsekuensi yang disengaja: pesan keluar dari nomor recruiter, bukan nomor
 * robot. Untuk rekrutmen itu justru lebih baik — kandidat bisa membalas ke
 * orang yang sama, dan recruiter bisa menyesuaikan kalimat sebelum mengirim.
 */

export const WA_PLACEHOLDERS = ["nama", "posisi", "perusahaan", "tahap"] as const;

export type WaValues = {
  nama: string;
  posisi: string;
  perusahaan: string;
  tahap: string;
};

/**
 * Mengganti penanda {nama}, {posisi}, {perusahaan}, {tahap} dengan nilainya.
 *
 * Penanda yang tidak dikenali dibiarkan apa adanya, bukan dihapus — kalau
 * seseorang salah ketik {namaa}, ia akan melihatnya di pratinjau dan tahu ada
 * yang keliru. Menghapusnya diam-diam justru menyembunyikan kesalahan.
 */
export function renderWaTemplate(body: string, values: WaValues): string {
  return body.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key as keyof WaValues] : match,
  );
}

/**
 * Menyusun URL wa.me.
 *
 * Nomor harus tanpa tanda plus dan tanpa pemisah — wa.me menolak format E.164
 * lengkap meski itu yang tersimpan di database.
 */
export function waLink(phoneE164: string, message: string): string | null {
  const digits = phoneE164.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

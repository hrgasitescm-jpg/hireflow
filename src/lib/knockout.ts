/**
 * Aturan penggugur otomatis untuk pertanyaan screening.
 *
 * Kolom is_knockout dan knockout_rule sudah ada di skema sejak migrasi pertama
 * tapi tidak pernah punya antarmuka maupun logika. Berkas ini yang mengisinya.
 *
 * Bentuk aturan sengaja sesederhana mungkin: satu operator, satu nilai
 * pembanding. Aturan yang lebih rumit — gabungan beberapa syarat, atau logika
 * bersyarat — akan sulit dijelaskan di antarmuka dan lebih sulit lagi
 * dipertanggungjawabkan ketika seorang pelamar bertanya kenapa ia gugur.
 */

export const KNOCKOUT_OPS = ["lt", "gt", "neq", "eq"] as const;
export type KnockoutOp = (typeof KNOCKOUT_OPS)[number];

export type KnockoutRule = { op: KnockoutOp; value: string | number };

/** Dibaca sebagai: "Gugurkan pelamar jika jawabannya ___". */
export const KNOCKOUT_OP_LABEL: Record<KnockoutOp, string> = {
  lt: "kurang dari",
  gt: "lebih dari",
  neq: "tidak sama dengan",
  eq: "sama dengan",
};

export function parseKnockoutRule(raw: unknown): KnockoutRule | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { op?: unknown; value?: unknown };
  if (!KNOCKOUT_OPS.includes(r.op as KnockoutOp)) return null;
  if (typeof r.value !== "string" && typeof r.value !== "number") return null;
  return { op: r.op as KnockoutOp, value: r.value };
}

/**
 * Menentukan apakah sebuah jawaban menggugurkan pelamar.
 *
 * Perbandingan angka hanya dipakai kalau KEDUA sisi benar-benar angka. Kalau
 * salah satunya bukan, perbandingan jatuh ke teks tanpa memperhatikan huruf
 * besar-kecil — mencegah pelamar gugur karena menulis "Ya" alih-alih "ya".
 *
 * Jawaban kosong TIDAK pernah menggugurkan. Pelamar yang melewatkan pertanyaan
 * tidak opsional sudah tertahan validasi form; menggugurkan karena kosong akan
 * menghukum orang yang kolomnya gagal terkirim, bukan yang tidak memenuhi
 * syarat.
 */
export function isKnockedOut(answer: unknown, rule: KnockoutRule): boolean {
  if (answer == null || answer === "") return false;

  const a = typeof answer === "number" ? answer : String(answer).trim();
  const b = rule.value;

  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  const keduanyaAngka =
    !Number.isNaN(aNum) && !Number.isNaN(bNum) && String(a).trim() !== "";

  switch (rule.op) {
    case "lt":
      return keduanyaAngka ? aNum < bNum : false;
    case "gt":
      return keduanyaAngka ? aNum > bNum : false;
    case "eq":
      return keduanyaAngka
        ? aNum === bNum
        : String(a).toLowerCase() === String(b).toLowerCase();
    case "neq":
      return keduanyaAngka
        ? aNum !== bNum
        : String(a).toLowerCase() !== String(b).toLowerCase();
  }
}

/** Kalimat alasan yang tercatat di lamaran, supaya recruiter tahu sebabnya. */
export function knockoutReason(label: string, rule: KnockoutRule): string {
  return `Gugur otomatis: jawaban "${label}" ${KNOCKOUT_OP_LABEL[rule.op]} ${rule.value}.`;
}

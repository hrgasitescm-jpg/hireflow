/**
 * Model dokumen teks kaya.
 *
 * Isinya disimpan sebagai JSON, BUKAN HTML. Ini keputusan keamanan, bukan
 * selera: sebagian isian datang dari pelamar anonim di internet, dan HTML dari
 * sumber tak dikenal yang dirender apa adanya adalah cara paling umum
 * memasukkan skrip berbahaya ke layar orang lain.
 *
 * Dengan JSON, penampil berjalan dengan membangun elemen React satu per satu
 * dari daftar node yang diizinkan. Tidak ada dangerouslySetInnerHTML di mana
 * pun, sehingga tidak ada jalan masuk bagi tag apa pun yang tidak dikenali.
 */

export type RichMark = { type: "bold" | "italic" };

export type RichNode =
  | { type: "text"; text: string; marks?: RichMark[] }
  | { type: "hardBreak" }
  | { type: "paragraph"; content?: RichNode[] }
  | { type: "heading"; attrs?: { level?: number }; content?: RichNode[] }
  | { type: "bulletList"; content?: RichNode[] }
  | { type: "orderedList"; content?: RichNode[] }
  | { type: "listItem"; content?: RichNode[] };

export type RichDoc = { type: "doc"; content?: RichNode[] };

/** Node yang boleh ada. Apa pun di luar daftar ini dibuang saat validasi. */
const ALLOWED_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "text",
  "hardBreak",
]);

const ALLOWED_MARKS = new Set(["bold", "italic"]);

/** Hanya h2 dan h3. h1 disediakan untuk judul halaman. */
const ALLOWED_HEADING_LEVELS = new Set([2, 3]);

/**
 * Membersihkan dokumen agar hanya berisi node dan mark yang diizinkan.
 *
 * Dijalankan di server sebelum disimpan. Jangan pernah mempercayai bentuk
 * dokumen yang dikirim dari browser — siapa pun bisa mengirim JSON apa saja
 * ke Server Action, bukan hanya lewat editor.
 */
export function sanitizeRichDoc(input: unknown): RichDoc {
  const empty: RichDoc = { type: "doc", content: [] };
  if (!input || typeof input !== "object") return empty;

  const node = input as { type?: unknown; content?: unknown };
  if (node.type !== "doc") return empty;

  return { type: "doc", content: sanitizeNodes(node.content) };
}

function sanitizeNodes(value: unknown): RichNode[] {
  if (!Array.isArray(value)) return [];
  const out: RichNode[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    const type = typeof n.type === "string" ? n.type : "";
    if (!ALLOWED_NODES.has(type) || type === "doc") continue;

    if (type === "text") {
      const text = typeof n.text === "string" ? n.text : "";
      if (!text) continue;
      const marks = Array.isArray(n.marks)
        ? (n.marks
            .map((m) =>
              m && typeof m === "object" && ALLOWED_MARKS.has(String((m as { type?: unknown }).type))
                ? { type: String((m as { type: string }).type) as RichMark["type"] }
                : null,
            )
            .filter(Boolean) as RichMark[])
        : undefined;
      out.push(marks?.length ? { type: "text", text, marks } : { type: "text", text });
      continue;
    }

    if (type === "hardBreak") {
      out.push({ type: "hardBreak" });
      continue;
    }

    if (type === "heading") {
      const rawLevel = (n.attrs as { level?: unknown } | undefined)?.level;
      const level = ALLOWED_HEADING_LEVELS.has(Number(rawLevel)) ? Number(rawLevel) : 2;
      out.push({ type: "heading", attrs: { level }, content: sanitizeNodes(n.content) });
      continue;
    }

    out.push({
      type: type as "paragraph" | "bulletList" | "orderedList" | "listItem",
      content: sanitizeNodes(n.content),
    });
  }

  return out;
}

/** Dokumen tanpa teks sama sekali dianggap kosong. */
export function isRichDocEmpty(doc: RichDoc | null | undefined): boolean {
  if (!doc?.content?.length) return true;
  return plainTextFromDoc(doc).trim().length === 0;
}

/**
 * Teks polos dari dokumen — dipakai untuk meta description, data terstruktur
 * Google Jobs, dan tempat lain yang tidak boleh berisi markup.
 */
export function plainTextFromDoc(doc: RichDoc | null | undefined): string {
  if (!doc?.content) return "";
  const parts: string[] = [];

  const walk = (nodes: RichNode[]) => {
    for (const n of nodes) {
      if (n.type === "text") parts.push(n.text);
      else if (n.type === "hardBreak") parts.push("\n");
      else if ("content" in n && n.content) {
        walk(n.content);
        if (n.type === "paragraph" || n.type === "heading" || n.type === "listItem") {
          parts.push("\n");
        }
      }
    }
  };

  walk(doc.content);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Membersihkan nilai kiriman form lalu mengembalikannya sebagai string siap
 * simpan. Dokumen yang tidak berisi teks disimpan sebagai string kosong,
 * bukan '{"type":"doc","content":[]}' — supaya pemeriksaan "sudah diisi belum"
 * di seluruh aplikasi tetap sesederhana memeriksa string kosong.
 */
export function sanitizeRichInput(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* Bukan JSON — kemungkinan teks polos dari klien tanpa JavaScript.
       Diperlakukan sebagai teks biasa, bukan ditolak. */
    return JSON.stringify(parseStoredDoc(raw));
  }

  const doc = sanitizeRichDoc(parsed);
  return isRichDocEmpty(doc) ? "" : JSON.stringify(doc);
}

/**
 * Membaca nilai tersimpan menjadi dokumen.
 *
 * Kolomnya bertipe text dan dulu berisi teks polos, jadi nilai lama harus
 * tetap terbaca. Baris berawalan "-" dikenali sebagai daftar karena itulah
 * format yang berlaku sebelumnya — tanpa ini, daftar kualifikasi lama akan
 * tampil sebagai paragraf berisi tanda hubung.
 */
export function parseStoredDoc(value: string | null | undefined): RichDoc {
  if (!value || !value.trim()) return { type: "doc", content: [] };

  const trimmed = value.trim();
  if (trimmed.startsWith("{")) {
    try {
      return sanitizeRichDoc(JSON.parse(trimmed));
    } catch {
      /* bukan JSON yang sah — jatuh ke penanganan teks polos di bawah */
    }
  }

  const content: RichNode[] = [];
  let bullets: RichNode[] = [];

  const flush = () => {
    if (!bullets.length) return;
    content.push({ type: "bulletList", content: bullets });
    bullets = [];
  };

  for (const line of value.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (/^[-*•]\s+/.test(t)) {
      bullets.push({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text: t.replace(/^[-*•]\s+/, "") }] }],
      });
    } else {
      flush();
      content.push({ type: "paragraph", content: [{ type: "text", text: t }] });
    }
  }
  flush();

  return { type: "doc", content };
}

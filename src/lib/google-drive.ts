import "server-only";

/**
 * Klien Google Drive seperlunya, dibangun di atas fetch.
 *
 * Paket resmi `googleapis` sengaja TIDAK dipakai. Ukurannya puluhan megabyte
 * dan bergantung pada API Node yang tidak tersedia di Cloudflare Workers.
 * Worker ini hanya punya ruang 3 MiB terkompresi di plan gratis, dan saat ini
 * terpakai 1,67 MiB — menambahkan googleapis akan menghabiskannya. Yang
 * dibutuhkan cuma tiga operasi, dan ketiganya panggilan HTTP biasa.
 *
 * Autentikasi memakai OAuth atas nama satu akun manusia, bukan service
 * account. Bukan pilihan gaya: service account tidak punya kuota penyimpanan
 * Drive sama sekali dan tidak bisa memiliki berkas. Alternatifnya Shared
 * Drive, dan itu hanya ada di Google Workspace berbayar.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

export type DriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId: string;
};

/** Membaca konfigurasi Drive, atau null kalau belum diatur. */
export function driveConfig(): DriveConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken || !rootFolderId) return null;
  return { clientId, clientSecret, refreshToken, rootFolderId };
}

/**
 * Menukar refresh token dengan access token.
 *
 * Tidak ada cache. Access token berumur satu jam, tapi setiap isolate Worker
 * berumur pendek dan tidak berbagi memori — cache dalam proses hampir tidak
 * pernah kena. Menyimpannya di KV menambah binding dan titik gagal baru demi
 * menghemat satu permintaan HTTP per unggahan. Tidak sepadan pada volume
 * lamaran yang wajar.
 */
async function accessToken(cfg: DriveConfig): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    /* invalid_grant biasanya berarti refresh token dicabut Google — paling
       sering karena aplikasi OAuth masih berstatus Testing, yang membuat
       token mati setiap 7 hari. Pesannya dibuat spesifik supaya penyebabnya
       tidak perlu ditebak-tebak saat kejadian. */
    if (body.includes("invalid_grant")) {
      throw new Error(
        "Refresh token Google ditolak. Kemungkinan besar aplikasi OAuth masih berstatus Testing sehingga tokennya dicabut setelah 7 hari. Publikasikan aplikasinya ke In production lalu ambil token baru.",
      );
    }
    throw new Error(`Gagal menukar refresh token (HTTP ${res.status})`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Google tidak mengembalikan access token.");
  return json.access_token;
}

/** Menghindari escape aneh di query Drive; kutip tunggal harus di-escape. */
function q(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Mencari subfolder berdasarkan nama, membuatnya kalau belum ada.
 *
 * Drive mengizinkan dua folder bernama sama dalam satu induk, jadi pencarian
 * dilakukan lebih dulu — tanpa itu, setiap lamaran akan membuat folder baru
 * dengan nama yang sama dan Drive HR jadi penuh duplikat.
 */
async function ensureFolder(
  token: string,
  name: string,
  parentId: string,
): Promise<string> {
  const query = [
    `name = '${q(name)}'`,
    `'${q(parentId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");

  const found = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (found.ok) {
    const json = (await found.json()) as { files?: { id: string }[] };
    const existing = json.files?.[0]?.id;
    if (existing) return existing;
  }

  const created = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!created.ok) {
    throw new Error(`Gagal membuat folder Drive (HTTP ${created.status})`);
  }
  const json = (await created.json()) as { id: string };
  return json.id;
}

/** Nama berkas yang aman untuk Drive dan enak dibaca manusia. */
function safeName(name: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "CV"
  );
}

export type DriveUpload = { fileId: string; folderId: string };

/**
 * Mengunggah CV ke folder per lowongan.
 *
 * Berkas diberi nama "{Nama Pelamar}.pdf" di dalam folder berjudul lowongan,
 * karena seluruh tujuan pemindahan ini adalah supaya tim HR bisa menelusuri
 * Drive tanpa membuka aplikasi. Nama acak akan menggagalkan tujuan itu.
 */
export async function uploadResume(
  cfg: DriveConfig,
  {
    file,
    candidateName,
    jobTitle,
  }: { file: File; candidateName: string; jobTitle: string },
): Promise<DriveUpload> {
  const token = await accessToken(cfg);
  const folderId = await ensureFolder(token, safeName(jobTitle), cfg.rootFolderId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const metadata = {
    name: `${safeName(candidateName)}.${ext}`,
    parents: [folderId],
  };

  /* Drive memakai multipart/related, bukan multipart/form-data, jadi FormData
     tidak bisa dipakai dan badannya dirangkai manual. */
  const boundary = `hf${crypto.randomUUID().replace(/-/g, "")}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    file,
    `\r\n--${boundary}--\r\n`,
  ]);

  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Gagal mengunggah ke Drive (HTTP ${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as { id: string };
  return { fileId: json.id, folderId };
}

/**
 * Mengambil isi berkas untuk diteruskan ke browser recruiter.
 *
 * Berkas Drive tidak punya padanan signed URL berumur pendek seperti Supabase
 * Storage, jadi Worker yang menjadi perantara. Konsekuensinya isi berkas
 * melewati Worker dan memakai bandwidth-nya — itu harga yang dibayar untuk
 * menjaga kendali akses tetap di aplikasi, bukan menyerahkannya ke tautan
 * Drive yang bisa diteruskan siapa saja.
 */
export async function fetchResume(
  cfg: DriveConfig,
  fileId: string,
): Promise<Response> {
  const token = await accessToken(cfg);
  return fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
}

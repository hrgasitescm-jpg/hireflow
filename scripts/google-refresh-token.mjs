/**
 * Mengambil refresh token Google Drive — dijalankan sekali saja.
 *
 *   node scripts/google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * Skrip ini membuka server lokal singkat di port 8977 untuk menangkap kode
 * otorisasi, persis seperti cara `wrangler login` bekerja. Tanpa itu Anda
 * harus menyalin kode dari bilah alamat secara manual, dan kode itu mudah
 * kedaluwarsa sebelum sempat ditempel.
 *
 * Scope yang diminta hanya `drive.file`: aplikasi hanya bisa menyentuh berkas
 * yang dibuatnya sendiri, bukan seluruh isi Drive Anda.
 */

import { createServer } from "node:http";

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const PORT = 8977;
const REDIRECT = `http://localhost:${PORT}/callback`;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Pemakaian: node scripts/google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>",
  );
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    // access_type=offline wajib supaya Google mengirim refresh token.
    access_type: "offline",
    // prompt=consent memaksa refresh token baru terbit walau akun ini sudah
    // pernah menyetujui — tanpa itu Google hanya mengirim access token.
    prompt: "consent",
  });

console.log("\nBuka tautan ini di browser, lalu setujui:\n");
console.log(authUrl);
console.log("\nMenunggu di " + REDIRECT + " …\n");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }

  const error = url.searchParams.get("error");
  if (error) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h1>Otorisasi ditolak</h1><p>${error}</p>`);
    console.error("Otorisasi ditolak:", error);
    server.close();
    process.exit(1);
  }

  const code = url.searchParams.get("code");
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT,
      grant_type: "authorization_code",
    }),
  });

  const json = await tokenRes.json();

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    json.refresh_token
      ? "<h1>Berhasil</h1><p>Refresh token sudah dicetak di terminal. Tab ini boleh ditutup.</p>"
      : "<h1>Gagal</h1><p>Lihat terminal untuk detailnya.</p>",
  );

  if (json.refresh_token) {
    console.log("\n===============================================");
    console.log("GOOGLE_REFRESH_TOKEN=" + json.refresh_token);
    console.log("===============================================\n");
    console.log("Pasang sebagai secret Worker:");
    console.log("  npx wrangler secret put GOOGLE_REFRESH_TOKEN\n");
  } else {
    console.error("\nGoogle tidak mengirim refresh_token. Jawabannya:");
    console.error(JSON.stringify(json, null, 2));
    console.error(
      "\nPenyebab tersering: akun ini sudah pernah menyetujui aplikasi tadi.",
    );
    console.error(
      "Cabut aksesnya di https://myaccount.google.com/permissions lalu ulangi.\n",
    );
  }

  server.close();
  process.exit(json.refresh_token ? 0 : 1);
});

server.listen(PORT);

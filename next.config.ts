import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    /**
     * Optimasi gambar bawaan Next.js memerlukan sharp, yang tidak bisa
     * berjalan di Cloudflare Workers. Di sana optimasi hanya tersedia lewat
     * Cloudflare Images yang berbayar.
     *
     * Aplikasi ini hanya memakai next/image untuk dua logo statis berukuran
     * kecil di src/components/logo.tsx, jadi mematikan optimasi tidak
     * merugikan apa pun — dan menghemat biaya yang tidak perlu.
     */
    unoptimized: true,
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

/**
 * Menjadikan binding Cloudflare (env, assets) tersedia saat `next dev`.
 *
 * Ditulis sebagai side effect setelah export default — itu memang bentuk yang
 * dihasilkan `opennextjs-cloudflare migrate`, dan urutannya tidak masalah
 * karena hanya berjalan di proses dev, bukan saat build produksi.
 */
import("@opennextjs/cloudflare").then((m) =>
  m.initOpenNextCloudflareForDev(),
);

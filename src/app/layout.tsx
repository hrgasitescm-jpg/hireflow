import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * Inter di-host sendiri, bukan lewat next/font/google.
 * Alasannya: build tidak boleh bergantung pada koneksi ke fonts.googleapis.com —
 * itu membuat build gagal saat offline, di CI tertutup, atau saat Google lambat.
 * Berkas woff2 diambil dari paket @fontsource-variable/inter (SIL OFL 1.1).
 */
const inter = localFont({
  src: [
    {
      path: "./fonts/inter-latin-variable.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/inter-latin-ext-variable.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-inter",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "CKB — Applicant Tracking System",
    template: "%s · CKB",
  },
  description:
    "Kelola lowongan, pelamar, dan pipeline rekrutmen dalam satu tempat yang rapi.",
  icons: {
    icon: "/icon-32.png",
    apple: "/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

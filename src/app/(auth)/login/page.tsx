import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="text-xl font-semibold text-ink">Masuk ke akun</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Kelola lowongan dan pelamar perusahaanmu.
      </p>

      <LoginForm next={next ?? "/"} />

      <p className="mt-8 text-[13px] text-muted">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-ink underline decoration-gold-400 decoration-2 underline-offset-4 hover:decoration-gold-500"
        >
          Daftar gratis
        </Link>
      </p>
    </>
  );
}

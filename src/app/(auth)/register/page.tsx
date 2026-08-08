import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-semibold text-ink">Buat akun</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        Gratis, tanpa kartu kredit.
      </p>

      <RegisterForm />

      <p className="mt-8 text-[13px] text-muted">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-ink underline decoration-gold-400 decoration-2 underline-offset-4 hover:decoration-gold-500"
        >
          Masuk
        </Link>
      </p>
    </>
  );
}

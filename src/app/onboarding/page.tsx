import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMemberships, requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Buat organisasi" };

export default async function OnboardingPage() {
  await requireUser();
  const memberships = await getMemberships();

  // Sudah punya organisasi? Langsung ke dashboard.
  if (memberships.length > 0) {
    redirect(`/${memberships[0]!.org.slug}/dashboard`);
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <Logo variant="lockup" className="h-7 w-auto" priority />

        <h1 className="mt-10 text-xl font-semibold text-ink">
          Buat organisasi pertamamu
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Semua lowongan, kandidat, dan anggota tim berada di dalam organisasi.
        </p>

        <OnboardingForm />
      </div>
    </div>
  );
}

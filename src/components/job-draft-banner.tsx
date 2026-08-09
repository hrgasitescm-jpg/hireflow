"use client";

import { useState, useTransition } from "react";
import { EyeOff, Loader2 } from "lucide-react";
import { setJobStatus } from "@/app/(app)/[orgSlug]/jobs/actions";
import { Alert, Button } from "@/components/ui";

/**
 * Peringatan bahwa lowongan belum terlihat publik.
 *
 * Tanpa ini, satu-satunya petunjuk status ada pada tombol dropdown yang
 * berlabel status SAAT INI ("Draf") — label itu menggambarkan keadaan, bukan
 * aksi, sehingga tidak terbaca sebagai cara menerbitkan. Akibatnya orang
 * membuat lowongan, membukanya di career page, dan tidak menemukan apa pun
 * tanpa tahu sebabnya.
 *
 * Status selain draft dan published (ditahan, ditutup, diarsipkan) juga tidak
 * tampil di career page, jadi peringatannya berlaku untuk semuanya.
 */
export function JobDraftBanner({
  orgSlug,
  jobId,
  status,
}: {
  orgSlug: string;
  jobId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "published") return null;

  const isDraft = status === "draft";

  function publish() {
    setError(null);
    startTransition(async () => {
      const result = await setJobStatus(orgSlug, jobId, "published");
      if (!result.ok) setError(result.error ?? "Gagal menerbitkan lowongan.");
    });
  }

  return (
    <div className="mb-6 rounded-surface border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <EyeOff
            className="mt-0.5 size-[1.125rem] shrink-0 text-amber-700"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-body font-semibold text-amber-900">
              Belum terlihat di career page
            </p>
            <p className="mt-1 text-small leading-relaxed text-amber-800">
              {isDraft
                ? "Lowongan ini masih draf. Pelamar tidak bisa melihat atau melamarnya sampai diterbitkan."
                : "Lowongan ini tidak sedang terbit, jadi tidak muncul di career page."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="gold"
          size="sm"
          onClick={publish}
          disabled={pending}
          className="shrink-0"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {pending ? "Menerbitkan…" : "Terbitkan sekarang"}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}

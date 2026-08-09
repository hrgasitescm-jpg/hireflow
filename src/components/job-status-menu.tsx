"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { setJobStatus } from "@/app/(app)/[orgSlug]/jobs/actions";
import { Alert, buttonClass } from "@/components/ui";
import { JOB_STATUS_LABEL } from "@/lib/utils";

const OPTIONS = ["draft", "published", "on_hold", "closed", "archived"] as const;

export function JobStatusMenu({
  orgSlug,
  jobId,
  current,
}: {
  orgSlug: string;
  jobId: string;
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(status: (typeof OPTIONS)[number]) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await setJobStatus(orgSlug, jobId, status);
      if (!result.ok) setError(result.error ?? "Gagal mengubah status.");
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={pending}
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {JOB_STATUS_LABEL[current]}
        <ChevronDown className="size-4" aria-hidden />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-20 mt-1.5 w-52 overflow-hidden rounded-control border border-line bg-surface py-1.5 shadow-lg">
            <p className="px-3 pt-1 pb-2 text-label uppercase text-muted">
              Ubah status
            </p>
            {OPTIONS.filter((s) => s !== current).map((status) => (
              <button
                key={status}
                type="button"
                className="block w-full px-3 py-2 text-left text-small text-ink-soft transition-colors hover:bg-line-soft hover:text-ink"
                onClick={() => change(status)}
              >
                {JOB_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Kegagalan ditampilkan melayang di bawah tombol supaya tidak menggeser
          tata letak header, tapi tetap tidak mungkin terlewat. */}
      {error && (
        <div className="absolute top-full right-0 z-30 mt-2 w-72">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}

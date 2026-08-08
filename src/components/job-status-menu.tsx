"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { setJobStatus } from "@/app/(app)/[orgSlug]/jobs/actions";
import { buttonClass } from "@/components/ui";
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
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={pending}
        className={buttonClass({ variant: "secondary", size: "sm" })}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
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
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-control bg-white py-1 shadow-lg ring-1 ring-line">
            {OPTIONS.filter((s) => s !== current).map((status) => (
              <button
                key={status}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-ink-soft hover:bg-line-soft"
                onClick={() => {
                  setOpen(false);
                  startTransition(() => setJobStatus(orgSlug, jobId, status));
                }}
              >
                {JOB_STATUS_LABEL[status]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

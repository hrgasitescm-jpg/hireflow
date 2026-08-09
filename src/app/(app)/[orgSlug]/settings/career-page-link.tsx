"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button, Input } from "@/components/ui";

export function CareerPageLink({ orgSlug }: { orgSlug: string }) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/karier/${orgSlug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard diblokir (misalnya non-HTTPS) — biarkan user menyalin manual.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input readOnly value={url} className="min-w-0 flex-1 font-mono text-caption" />
      <Button variant="secondary" size="md" onClick={copy} type="button">
        {copied ? (
          <Check className="size-4 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="size-4" aria-hidden />
        )}
        {copied ? "Tersalin" : "Salin"}
      </Button>
      <a
        href={`/karier/${orgSlug}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-control bg-white px-4 text-sm font-medium text-ink ring-1 ring-inset ring-line hover:bg-line-soft"
      >
        <ExternalLink className="size-4" aria-hidden />
        Buka
      </a>
    </div>
  );
}

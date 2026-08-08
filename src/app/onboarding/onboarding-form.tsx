"use client";

import { useActionState, useState } from "react";
import { createOrganization, type OrgState } from "./actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { slugify } from "@/lib/utils";

const initial: OrgState = {};

export function OnboardingForm() {
  const [state, action] = useActionState(createOrganization, initial);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={action} className="mt-8 space-y-5">
      <Field label="Nama organisasi" htmlFor="name" required>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="PT Maju Bersama"
        />
      </Field>

      <Field
        label="Alamat career page"
        htmlFor="slug"
        hint="Halaman lowongan publikmu akan berada di alamat ini. Bisa diubah nanti."
        required
      >
        <div className="flex items-stretch">
          <span className="inline-flex select-none items-center rounded-l-control bg-line-soft px-3 text-[13px] text-muted ring-1 ring-inset ring-line">
            /karier/
          </span>
          <Input
            id="slug"
            name="slug"
            required
            minLength={3}
            maxLength={50}
            pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
            className="rounded-l-none"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="maju-bersama"
          />
        </div>
      </Field>

      {state.error && <Alert>{state.error}</Alert>}

      <SubmitButton size="lg" pendingLabel="Membuat…" className="w-full">
        Buat organisasi
      </SubmitButton>
    </form>
  );
}

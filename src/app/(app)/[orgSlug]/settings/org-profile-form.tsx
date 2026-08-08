"use client";

import { useActionState } from "react";
import { updateOrgProfile, type ProfileState } from "./actions";
import { Alert, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function OrgProfileForm({
  orgSlug,
  initial,
}: {
  orgSlug: string;
  initial: {
    name: string;
    about: string;
    website: string;
    brandColor: string;
  };
}) {
  const [state, action] = useActionState(
    updateOrgProfile.bind(null, orgSlug),
    {} as ProfileState,
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Nama organisasi" htmlFor="name" required>
        <Input id="name" name="name" required defaultValue={initial.name} />
      </Field>

      <Field
        label="Tentang perusahaan"
        htmlFor="about"
        hint="Tampil di bagian atas career page."
      >
        <Textarea
          id="about"
          name="about"
          rows={4}
          maxLength={2000}
          defaultValue={initial.about}
        />
      </Field>

      <Field label="Website" htmlFor="website">
        <Input
          id="website"
          name="website"
          type="url"
          defaultValue={initial.website}
          placeholder="https://perusahaan.com"
        />
      </Field>

      <Field label="Warna brand" htmlFor="brandColor">
        <div className="flex items-center gap-3">
          <input
            id="brandColor"
            name="brandColor"
            type="color"
            defaultValue={initial.brandColor}
            className="h-10 w-16 cursor-pointer rounded-control border border-line bg-white p-1"
          />
          <span className="text-sm text-muted">
            Dipakai untuk logo placeholder dan aksen career page.
          </span>
        </div>
      </Field>

      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert tone="success">Perubahan tersimpan.</Alert>}

      <SubmitButton>Simpan perubahan</SubmitButton>
    </form>
  );
}

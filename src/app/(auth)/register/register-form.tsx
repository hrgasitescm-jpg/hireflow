"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: AuthState = {};

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initial);

  return (
    <form action={action} className="mt-8 space-y-5">
      <Field label="Nama lengkap" htmlFor="fullName" required>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          minLength={2}
          placeholder="Fitrah Andre"
        />
      </Field>

      <Field label="Email kerja" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@perusahaan.com"
        />
      </Field>

      <Field
        label="Kata sandi"
        htmlFor="password"
        hint="Minimal 8 karakter."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      {state.error && <Alert>{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <SubmitButton size="lg" pendingLabel="Membuat akun…" className="w-full">
        Daftar
      </SubmitButton>
    </form>
  );
}

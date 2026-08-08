"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "../actions";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: AuthState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initial);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nama@perusahaan.com"
        />
      </Field>

      <Field label="Kata sandi" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="••••••••"
        />
      </Field>

      {state.error && <Alert>{state.error}</Alert>}

      <SubmitButton size="lg" pendingLabel="Memproses…" className="w-full">
        Masuk
      </SubmitButton>
    </form>
  );
}

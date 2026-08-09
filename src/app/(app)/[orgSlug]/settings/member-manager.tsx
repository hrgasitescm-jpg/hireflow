"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, UserMinus } from "lucide-react";
import {
  addMember,
  changeMemberRole,
  removeMember,
  type MemberState,
} from "./member-actions";
import { Alert, Avatar, Button, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL, formatDate } from "@/lib/utils";

export type ManagedMember = {
  id: string;
  role: string;
  createdAt: string;
  fullName: string;
  isSelf: boolean;
};

/** Peran yang bisa dipilih, berurut dari paling berwenang. */
const ASSIGNABLE_ROLES = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "interviewer",
  "agency",
  "viewer",
] as const;

export function MemberManager({
  orgSlug,
  members,
  canEdit,
}: {
  orgSlug: string;
  members: ManagedMember[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const addFormRef = useRef<HTMLFormElement>(null);

  const [addState, addAction] = useActionState(
    addMember.bind(null, orgSlug),
    {} as MemberState,
  );
  const [roleState, roleAction] = useActionState(
    changeMemberRole.bind(null, orgSlug),
    {} as MemberState,
  );
  const [removeState, removeAction] = useActionState(
    removeMember.bind(null, orgSlug),
    {} as MemberState,
  );

  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
      setAdding(false);
    }
  }, [addState.success]);

  const error = addState.error ?? roleState.error ?? removeState.error;
  const success = addState.success ?? roleState.success ?? removeState.success;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <Avatar name={m.fullName || "?"} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body font-semibold text-ink">
                {m.fullName || "Tanpa nama"}
                {m.isSelf && (
                  <span className="ml-2 text-caption font-normal text-muted">
                    (kamu)
                  </span>
                )}
              </p>
              <p className="text-caption text-muted">
                Bergabung {formatDate(m.createdAt)}
              </p>
            </div>

            {canEdit ? (
              <div className="flex items-center gap-2">
                {/* Peran disimpan begitu pilihan berubah — tidak ada tombol
                    Simpan terpisah supaya tidak ada perubahan yang tertinggal
                    tanpa disadari. */}
                <form action={roleAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <Select
                    name="role"
                    defaultValue={m.role}
                    aria-label={`Peran ${m.fullName}`}
                    className="h-9 w-44 text-small"
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </form>

                <form action={removeAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Keluarkan ${m.fullName}`}
                    className="text-muted hover:bg-red-50 hover:text-red-700"
                  >
                    <UserMinus className="size-4" aria-hidden />
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <span className="text-small text-muted">
                {ROLE_LABEL[m.role] ?? m.role}
              </span>
            )}
          </li>
        ))}
      </ul>

      {canEdit &&
        (adding ? (
          <form
            ref={addFormRef}
            action={addAction}
            className="space-y-4 rounded-control bg-line-soft p-4 ring-1 ring-inset ring-line"
          >
            <Field
              label="Email"
              htmlFor="email"
              required
              hint="Orangnya harus sudah punya akun. Minta dia mendaftar dulu lewat halaman Daftar."
            >
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                placeholder="nama@perusahaan.com"
              />
            </Field>

            <Field label="Peran" htmlFor="role" required>
              <Select id="role" name="role" defaultValue="recruiter">
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex gap-2">
              <SubmitButton size="sm">Tambahkan</SubmitButton>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
              >
                Batal
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Tambah anggota
          </Button>
        ))}

      {error && <Alert>{error}</Alert>}
      {success && !error && <Alert tone="success">{success}</Alert>}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createTerm,
  renameTerm,
  deleteTerm,
  type TermKind,
  type TermState,
} from "./taxonomy-actions";
import { Alert, Button, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type Term = { id: string; name: string };

/**
 * Pengelola daftar sederhana untuk Departemen dan Lokasi.
 *
 * Sebelum ini kedua tabel hanya bisa dibaca — form lowongan menampilkan
 * dropdown yang selamanya kosong karena tidak ada satu pun layar yang bisa
 * mengisinya. Komponen ini yang menutup lubang itu.
 */
export function TermManager({
  orgSlug,
  kind,
  terms,
  canEdit,
  emptyHint,
}: {
  orgSlug: string;
  kind: TermKind;
  terms: Term[];
  canEdit: boolean;
  emptyHint: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [addState, addAction] = useActionState(
    createTerm.bind(null, orgSlug),
    {} as TermState,
  );
  const [renameState, renameAction] = useActionState(
    renameTerm.bind(null, orgSlug),
    {} as TermState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteTerm.bind(null, orgSlug),
    {} as TermState,
  );

  const addFormRef = useRef<HTMLFormElement>(null);

  /* Tutup form setelah berhasil, dan kosongkan isiannya supaya nama
     sebelumnya tidak tertinggal saat menambah beberapa sekaligus. */
  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
      setAdding(false);
    }
  }, [addState.success]);

  useEffect(() => {
    if (renameState.success) setEditingId(null);
  }, [renameState.success]);

  const error = addState.error ?? renameState.error ?? deleteState.error;

  return (
    <div className="space-y-3">
      {terms.length > 0 ? (
        <ul className="divide-y divide-line rounded-control ring-1 ring-inset ring-line">
          {terms.map((term) => (
            <li key={term.id} className="flex items-center gap-2 px-3 py-2">
              {editingId === term.id ? (
                <form
                  action={renameAction}
                  className="flex flex-1 items-center gap-2"
                >
                  <input type="hidden" name="kind" value={kind} />
                  <input type="hidden" name="id" value={term.id} />
                  <Input
                    name="name"
                    defaultValue={term.name}
                    required
                    autoFocus
                    aria-label={`Ubah nama ${term.name}`}
                    className="h-8 flex-1 text-small"
                  />
                  <SubmitButton size="sm" variant="primary">
                    <Check className="size-3.5" aria-hidden />
                    Simpan
                  </SubmitButton>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    aria-label="Batal"
                  >
                    <X className="size-3.5" aria-hidden />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-small text-ink">
                    {term.name}
                  </span>
                  {canEdit && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(term.id)}
                        aria-label={`Ubah nama ${term.name}`}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                      <form action={deleteAction}>
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={term.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          aria-label={`Hapus ${term.name}`}
                          className="text-muted hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </SubmitButton>
                      </form>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-control border border-dashed border-line-strong px-3 py-6 text-center text-caption text-muted">
          {emptyHint}
        </p>
      )}

      {canEdit &&
        (adding ? (
          <form ref={addFormRef} action={addAction} className="flex gap-2">
            <input type="hidden" name="kind" value={kind} />
            <Input
              name="name"
              required
              autoFocus
              placeholder="Nama baru"
              aria-label="Nama baru"
              className="h-9 flex-1 text-small"
            />
            <SubmitButton size="sm">Tambah</SubmitButton>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setAdding(false)}
            >
              Batal
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" aria-hidden />
            Tambah
          </Button>
        ))}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

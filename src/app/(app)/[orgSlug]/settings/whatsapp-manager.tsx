"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  saveWaTemplate,
  deleteWaTemplate,
  type WaTemplateState,
} from "./whatsapp-actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { WA_PLACEHOLDERS } from "@/lib/whatsapp";

export type WaTemplate = { id: string; stage_name: string; body: string };

function Placeholders() {
  return (
    <p className="text-caption leading-relaxed text-muted">
      Penanda yang bisa dipakai:{" "}
      {WA_PLACEHOLDERS.map((p, i) => (
        <span key={p}>
          {i > 0 && ", "}
          <code className="rounded bg-line-soft px-1 py-0.5 font-mono text-[0.6875rem] text-ink-soft ring-1 ring-inset ring-line">
            {`{${p}}`}
          </code>
        </span>
      ))}
      . Penanda yang salah ketik dibiarkan apa adanya supaya kelihatan.
    </p>
  );
}

export function WhatsappManager({
  orgSlug,
  templates,
  canEdit,
}: {
  orgSlug: string;
  templates: WaTemplate[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const addFormRef = useRef<HTMLFormElement>(null);

  const [saveState, saveAction] = useActionState(
    saveWaTemplate.bind(null, orgSlug),
    {} as WaTemplateState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteWaTemplate.bind(null, orgSlug),
    {} as WaTemplateState,
  );

  useEffect(() => {
    if (saveState.success) {
      addFormRef.current?.reset();
      setAdding(false);
    }
  }, [saveState.success]);

  return (
    <div className="space-y-5">
      <Placeholders />

      {templates.length > 0 ? (
        <ul className="space-y-4">
          {templates.map((t) => (
            <li
              key={t.id}
              className="rounded-control bg-line-soft/60 p-4 ring-1 ring-inset ring-line"
            >
              <form action={saveAction} className="space-y-3">
                <input type="hidden" name="stageName" value={t.stage_name} />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-small font-semibold text-ink">
                    {t.stage_name}
                  </p>
                  {canEdit && (
                    <SubmitButton size="sm" variant="secondary">
                      Simpan
                    </SubmitButton>
                  )}
                </div>
                <Textarea
                  name="body"
                  defaultValue={t.body}
                  rows={4}
                  maxLength={1000}
                  readOnly={!canEdit}
                  aria-label={`Pesan untuk tahap ${t.stage_name}`}
                />
              </form>

              {canEdit && (
                <form action={deleteAction} className="mt-2 flex justify-end">
                  <input type="hidden" name="id" value={t.id} />
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    className="text-muted hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    Hapus
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-control border border-dashed border-line-strong px-3 py-6 text-center text-caption text-muted">
          Belum ada template. Tombol WhatsApp tetap muncul dengan sapaan
          seadanya.
        </p>
      )}

      {canEdit &&
        (adding ? (
          <form
            ref={addFormRef}
            action={saveAction}
            className="space-y-4 rounded-control bg-line-soft p-4 ring-1 ring-inset ring-line"
          >
            <Field
              label="Nama tahap"
              htmlFor="stageName"
              required
              hint="Harus sama persis dengan nama tahap di papan pipeline."
            >
              <Input
                id="stageName"
                name="stageName"
                required
                autoFocus
                placeholder="Asesmen"
              />
            </Field>

            <Field label="Pesan" htmlFor="body" required>
              <Textarea
                id="body"
                name="body"
                rows={4}
                required
                maxLength={1000}
                placeholder="Halo {nama}, …"
              />
            </Field>

            {saveState.error && <Alert>{saveState.error}</Alert>}

            <div className="flex gap-2">
              <SubmitButton size="sm">Tambah template</SubmitButton>
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
            Tambah template
          </Button>
        ))}

      {saveState.error && !adding && <Alert>{saveState.error}</Alert>}
      {deleteState.error && <Alert>{deleteState.error}</Alert>}
    </div>
  );
}

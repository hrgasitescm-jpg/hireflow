"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  addStage,
  renameStage,
  deleteStage,
  moveStage,
  type StageState,
} from "./stage-actions";
import { Alert, Badge, Button, Input } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type ManagedStage = {
  id: string;
  name: string;
  position: number;
  kind: string;
  count: number;
};

/** Tahap bawaan yang punya makna khusus di seluruh aplikasi. */
const KIND_LABEL: Record<string, string> = {
  applied: "Masuk otomatis",
  hired: "Akhir",
  rejected: "Ditolak",
};

export function StageManager({
  orgSlug,
  jobId,
  stages,
}: {
  orgSlug: string;
  jobId: string;
  stages: ManagedStage[];
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  const [addState, addAction] = useActionState(
    addStage.bind(null, orgSlug, jobId),
    {} as StageState,
  );
  const [renameState, renameAction] = useActionState(
    renameStage.bind(null, orgSlug, jobId),
    {} as StageState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteStage.bind(null, orgSlug, jobId),
    {} as StageState,
  );
  const [moveState, moveAction] = useActionState(
    moveStage.bind(null, orgSlug, jobId),
    {} as StageState,
  );

  useEffect(() => {
    if (addState.success) {
      addFormRef.current?.reset();
      setAdding(false);
    }
  }, [addState.success]);

  useEffect(() => {
    if (renameState.success) setEditingId(null);
  }, [renameState.success]);

  const error =
    addState.error ?? renameState.error ?? deleteState.error ?? moveState.error;

  return (
    <div className="space-y-3">
      <ol className="divide-y divide-line rounded-control ring-1 ring-inset ring-line">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex items-center gap-2 px-3 py-2.5">
            <span className="tabular w-5 shrink-0 text-caption text-subtle">
              {i + 1}
            </span>

            {editingId === stage.id ? (
              <form
                action={renameAction}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="id" value={stage.id} />
                <Input
                  name="name"
                  defaultValue={stage.name}
                  required
                  autoFocus
                  aria-label={`Ubah nama tahap ${stage.name}`}
                  className="h-8 flex-1 text-small"
                />
                <SubmitButton size="sm">
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
                <span className="min-w-0 flex-1 truncate text-small font-medium text-ink">
                  {stage.name}
                </span>

                {KIND_LABEL[stage.kind] && (
                  <Badge tone={stage.kind === "hired" ? "green" : "neutral"}>
                    {KIND_LABEL[stage.kind]}
                  </Badge>
                )}

                {stage.count > 0 && (
                  <span className="tabular shrink-0 text-caption text-muted">
                    {stage.count} kandidat
                  </span>
                )}

                <form action={moveAction} className="shrink-0">
                  <input type="hidden" name="id" value={stage.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Naikkan ${stage.name}`}
                    className={i === 0 ? "pointer-events-none opacity-30" : ""}
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                  </SubmitButton>
                </form>

                <form action={moveAction} className="shrink-0">
                  <input type="hidden" name="id" value={stage.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Turunkan ${stage.name}`}
                    className={
                      i === stages.length - 1
                        ? "pointer-events-none opacity-30"
                        : ""
                    }
                  >
                    <ArrowDown className="size-3.5" aria-hidden />
                  </SubmitButton>
                </form>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(stage.id)}
                  aria-label={`Ubah nama ${stage.name}`}
                >
                  <Pencil className="size-3.5" aria-hidden />
                </Button>

                <form action={deleteAction} className="shrink-0">
                  <input type="hidden" name="id" value={stage.id} />
                  <SubmitButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Hapus ${stage.name}`}
                    className="text-muted hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </SubmitButton>
                </form>
              </>
            )}
          </li>
        ))}
      </ol>

      {adding ? (
        <form ref={addFormRef} action={addAction} className="flex gap-2">
          <Input
            name="name"
            required
            autoFocus
            placeholder="Nama tahap baru"
            aria-label="Nama tahap baru"
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
          Tambah tahap
        </Button>
      )}

      {error && <Alert>{error}</Alert>}
    </div>
  );
}

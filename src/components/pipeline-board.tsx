"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Alert, Avatar } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import { moveApplicationStage } from "@/app/(app)/[orgSlug]/jobs/[jobId]/actions";
import { CandidateDrawer } from "@/components/candidate-drawer";

export type BoardStage = {
  id: string;
  name: string;
  position: number;
  kind: string;
};

export type BoardApplication = {
  id: string;
  stageId: string | null;
  appliedAt: string;
  stageEnteredAt: string;
  aiScore: number | null;
  candidate: {
    id: string;
    fullName: string;
    email: string;
    headline: string | null;
    yearsExp: number | null;
    skills: string[];
  };
};

/** Kandidat yang diam lebih dari 14 hari di satu tahap perlu perhatian. */
const AGING_DAYS = 14;

function daysInStage(stageEnteredAt: string) {
  return Math.floor(
    (Date.now() - new Date(stageEnteredAt).getTime()) / 86_400_000,
  );
}

export function PipelineBoard({
  orgSlug,
  jobId,
  stages,
  applications,
  readOnly = false,
}: {
  orgSlug: string;
  jobId: string;
  stages: BoardStage[];
  applications: BoardApplication[];
  readOnly?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openApp, setOpenApp] = useState<BoardApplication | null>(null);
  const [, startTransition] = useTransition();

  const [items, moveOptimistic] = useOptimistic(
    applications,
    (state, { id, stageId }: { id: string; stageId: string }) =>
      state.map((a) => (a.id === id ? { ...a, stageId } : a)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const applicationId = String(active.id);
    const stageId = String(over.id);
    const current = items.find((a) => a.id === applicationId);
    if (!current || current.stageId === stageId) return;

    setError(null);
    startTransition(async () => {
      moveOptimistic({ id: applicationId, stageId });
      const result = await moveApplicationStage(orgSlug, jobId, {
        applicationId,
        stageId,
      });
      if (!result.ok) setError(result.error ?? "Gagal memindahkan kandidat.");
    });
  }

  const active = activeId ? items.find((a) => a.id === activeId) : null;

  if (stages.length === 0) {
    return (
      <Alert tone="info">
        Lowongan ini belum punya tahapan pipeline. Coba muat ulang halaman.
      </Alert>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="thin-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              applications={items.filter((a) => a.stageId === stage.id)}
              readOnly={readOnly}
              onOpen={setOpenApp}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {active ? <CandidateCard application={active} dragging /> : null}
        </DragOverlay>
      </DndContext>

      {openApp && (
        <CandidateDrawer
          orgSlug={orgSlug}
          jobId={jobId}
          application={openApp}
          stages={stages}
          readOnly={readOnly}
          onClose={() => setOpenApp(null)}
        />
      )}
    </>
  );
}

function StageColumn({
  stage,
  applications,
  readOnly,
  onOpen,
}: {
  stage: BoardStage;
  applications: BoardApplication[];
  readOnly: boolean;
  onOpen: (a: BoardApplication) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    /* Kolom berlatar abu, kartu berlatar putih. Versi lama menaruh kartu putih
       di atas kolom putih, sehingga kartunya tidak terbaca sebagai benda yang
       bisa dipindahkan — padahal seluruh gunanya layar ini adalah memindahkan
       benda. */
    <section
      ref={setNodeRef}
      aria-label={`Tahap ${stage.name}`}
      className={cn(
        "flex w-[18.5rem] shrink-0 flex-col rounded-surface border transition-colors",
        isOver
          ? "border-gold-400 bg-gold-50"
          : "border-line bg-line-soft",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-4 py-3.5">
        <h2 className="truncate text-small font-semibold text-ink">
          {stage.name}
        </h2>
        <span className="tabular shrink-0 rounded-full bg-surface px-2 py-0.5 text-caption font-semibold text-ink-soft ring-1 ring-inset ring-line">
          {applications.length}
        </span>
      </header>

      <div className="thin-scrollbar flex max-h-[calc(100vh-15rem)] flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
        {applications.length === 0 ? (
          <p
            className={cn(
              "rounded-control border border-dashed py-10 text-center text-caption transition-colors",
              isOver
                ? "border-gold-400 text-gold-700"
                : "border-line-strong text-subtle",
            )}
          >
            {isOver ? "Lepas di sini" : "Kosong"}
          </p>
        ) : (
          applications.map((a) => (
            <DraggableCard
              key={a.id}
              application={a}
              readOnly={readOnly}
              onOpen={onOpen}
            />
          ))
        )}
      </div>
    </section>
  );
}

function DraggableCard({
  application,
  readOnly,
  onOpen,
}: {
  application: BoardApplication;
  readOnly: boolean;
  onOpen: (a: BoardApplication) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: application.id, disabled: readOnly });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <CandidateCard application={application} onOpen={onOpen} />
    </div>
  );
}

function CandidateCard({
  application,
  dragging,
  onOpen,
}: {
  application: BoardApplication;
  dragging?: boolean;
  onOpen?: (a: BoardApplication) => void;
}) {
  const { candidate } = application;
  const days = daysInStage(application.stageEnteredAt);
  const aging = days > AGING_DAYS;

  return (
    <article
      onClick={() => onOpen?.(application)}
      className={cn(
        "cursor-pointer rounded-control border border-line bg-surface p-3.5 shadow-xs",
        "transition-[box-shadow,border-color]",
        "hover:border-line-strong hover:shadow-sm",
        dragging && "rotate-2 border-gold-400 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={candidate.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-small font-semibold leading-tight text-ink">
            {candidate.fullName}
          </p>
          {candidate.headline && (
            <p className="mt-1 truncate text-caption text-muted">
              {candidate.headline}
            </p>
          )}
        </div>
        {application.aiScore != null && (
          <span
            className={cn(
              "tabular shrink-0 rounded-[5px] px-1.5 py-0.5 text-caption font-bold ring-1 ring-inset",
              application.aiScore >= 70
                ? "bg-gold-100 text-gold-800 ring-gold-200"
                : "bg-line-soft text-muted ring-line",
            )}
            title={`Skor kecocokan ${application.aiScore} dari 100`}
          >
            {application.aiScore}
          </span>
        )}
      </div>

      {candidate.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-[5px] bg-line-soft px-1.5 py-0.5 text-caption text-ink-soft ring-1 ring-inset ring-line"
            >
              {s}
            </span>
          ))}
          {candidate.skills.length > 3 && (
            <span className="px-1 py-0.5 text-caption text-subtle">
              +{candidate.skills.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-caption">
        <span className="text-subtle">{timeAgo(application.appliedAt)}</span>
        {/* Kandidat yang mengendap lebih dari 14 hari diberi tanda amber.
            Ini satu-satunya peringatan di kartu, jadi ia boleh berwarna. */}
        {aging && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            {days} hari di tahap ini
          </span>
        )}
      </div>
    </article>
  );
}

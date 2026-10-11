"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { QUESTIONS } from "@/lib/questionnaire";

function SortableRow({
  id,
  rank,
  title,
}: {
  id: string;
  rank: number;
  title: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      className={`flex items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-[var(--shadow-card)] transition ${
        isDragging ? "z-10 scale-[1.02] shadow-[var(--shadow-lift)]" : ""
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        className="cursor-grab rounded-lg p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
        {rank}
      </span>
      <span className="flex-1 font-semibold text-primary">{title}</span>
      <span className="text-xs font-medium text-muted-foreground">
        weight {10 - rank}
      </span>
    </li>
  );
}

export function IssueRanker({
  ranks,
  onChange,
}: {
  ranks: string[];
  onChange: (next: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );
  const titleById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.title]));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ranks.indexOf(String(active.id));
    const newIndex = ranks.indexOf(String(over.id));
    onChange(arrayMove(ranks, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ranks} strategy={verticalListSortingStrategy}>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {ranks.map((id, index) => (
            <SortableRow
              key={id}
              id={id}
              rank={index + 1}
              title={titleById[id] || id}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

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
      className={`rank-row ${isDragging ? "dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button type="button" className="grip" {...attributes} {...listeners}>
        <GripVertical size={18} />
      </button>
      <span className="rank-num">{rank}</span>
      <span className="rank-title">{title}</span>
      <span className="rank-weight">weight {10 - rank}</span>
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const titleById = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.title]));

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ranks.indexOf(String(active.id));
    const newIndex = ranks.indexOf(String(over.id));
    onChange(arrayMove(ranks, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ranks} strategy={verticalListSortingStrategy}>
        <ol className="rank-list">
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

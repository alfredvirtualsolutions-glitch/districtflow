import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

const COLUMN_STYLES = {
  Researching: { header: "bg-blue-50 border-blue-200 text-blue-700", dot: "bg-blue-400" },
  Contacted:   { header: "bg-yellow-50 border-yellow-200 text-yellow-700", dot: "bg-yellow-400" },
  Qualified:   { header: "bg-green-50 border-green-200 text-green-700", dot: "bg-green-400" },
  Archived:    { header: "bg-gray-50 border-gray-200 text-gray-500", dot: "bg-gray-400" },
};

export default function KanbanColumn({ status, districts, onCardClick }) {
  const style = COLUMN_STYLES[status] || COLUMN_STYLES.Researching;

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] bg-muted/40 rounded-xl border border-border overflow-hidden">
      {/* Column Header */}
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${style.header}`}>
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        <span className="font-semibold text-sm">{status}</span>
        <span className="ml-auto text-xs font-medium opacity-70">{districts.length}</span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${
              snapshot.isDraggingOver ? "bg-primary/5" : ""
            }`}
          >
            {districts.map((d, index) => (
              <Draggable key={d.id} draggableId={d.id} index={index}>
                {(provided) => (
                  <KanbanCard
                    district={d}
                    provided={provided}
                    onClick={() => onCardClick(d)}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
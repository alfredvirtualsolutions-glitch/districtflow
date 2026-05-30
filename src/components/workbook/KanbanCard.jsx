import React from "react";
import { ExternalLink, StickyNote, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function KanbanCard({ district, onClick, provided }) {
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
    >
      <p className="font-medium text-sm text-foreground leading-tight mb-2">
        {district.district_name}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {district.state && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {district.state}
          </Badge>
        )}
        {district.visibility === "Yes" ? (
          <Eye className="w-3.5 h-3.5 text-green-500" />
        ) : district.visibility === "No" ? (
          <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
        ) : null}
        {district.notes && (
          <StickyNote className="w-3.5 h-3.5 text-accent" />
        )}
        {district.staff_directory_url && (
          <a
            href={district.staff_directory_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-primary hover:text-primary/70"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
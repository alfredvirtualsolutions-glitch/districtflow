import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function StateFilter({ states, selectedState, onSelect }) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-2">
        <button
          onClick={() => onSelect("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
            selectedState === "all"
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card text-muted-foreground hover:bg-secondary border border-border"
          }`}
        >
          All States
        </button>
        {states.map((state) => (
          <button
            key={state.name}
            onClick={() => onSelect(state.name)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedState === state.name
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground hover:bg-secondary border border-border"
            }`}
          >
            {state.name}
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {state.count}
            </Badge>
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
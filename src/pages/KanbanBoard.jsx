import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import KanbanColumn from "../components/workbook/KanbanColumn";
import DistrictDetailDrawer from "../components/workbook/DistrictDetailDrawer";

const STATUSES = ["Researching", "Contacted", "Qualified", "Archived"];

export default function KanbanBoard() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const queryClient = useQueryClient();

  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["school-districts"],
    queryFn: () => base44.entities.SchoolDistrict.list("-created_date", 5000),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return districts;
    const q = search.toLowerCase();
    return districts.filter(
      (d) =>
        d.district_name?.toLowerCase().includes(q) ||
        d.state?.toLowerCase().includes(q)
    );
  }, [districts, search]);

  const columns = useMemo(() => {
    const grouped = {};
    STATUSES.forEach((s) => (grouped[s] = []));
    filtered.forEach((d) => {
      const s = d.status || "Researching";
      if (grouped[s]) grouped[s].push(d);
      else grouped["Researching"].push(d);
    });
    return grouped;
  }, [filtered]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;

    // Optimistic update
    queryClient.setQueryData(["school-districts"], (old) =>
      old.map((d) => (d.id === draggableId ? { ...d, status: newStatus } : d))
    );

    await base44.entities.SchoolDistrict.update(draggableId, { status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutGrid className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Pipeline Board</h1>
              <p className="text-sm text-muted-foreground">Drag districts between stages</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search districts..."
                className="pl-10 w-56"
              />
            </div>
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Workbook
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto px-4 sm:px-6 py-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full" style={{ minWidth: "max-content" }}>
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                districts={columns[status] || []}
                onCardClick={setSelected}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      <DistrictDetailDrawer district={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
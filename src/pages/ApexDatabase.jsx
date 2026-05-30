import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Database, BookOpen, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import ApexTable from "@/components/apex/ApexTable";
import ApexStatsBar from "@/components/apex/ApexStatsBar";
import ApexImportDialog from "@/components/apex/ApexImportDialog";

export default function ApexDatabase() {
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["apex-records"],
    queryFn: () => base44.entities.ApexRecord.list("-created_date", 10000),
  });

  const stateOptions = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const st = r.state || "—";
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
  }, [records]);

  const statusOptions = useMemo(() => {
    const set = new Set(records.map((r) => r.status).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    let result = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.employer_name?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          r.tpa_name?.toLowerCase().includes(q)
      );
    }
    if (selectedState !== "all") result = result.filter((r) => r.state === selectedState);
    if (selectedStatus !== "all") result = result.filter((r) => r.status === selectedStatus);
    return result;
  }, [records, search, selectedState, selectedStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Database className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Apex Database</h1>
              <p className="text-sm text-muted-foreground">403(b) TPA Payroll Slots — All Sources</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Workbook
              </Button>
            </Link>
            <Link to="/kanban">
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Pipeline
              </Button>
            </Link>
            <ApexImportDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <ApexStatsBar records={records} />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employers, cities, TPAs..."
              className="pl-10"
            />
          </div>

          {/* State filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedState("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedState === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              All States
            </button>
            {stateOptions.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => setSelectedState(name)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedState === name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {name} ({count})
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedStatus === "all"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              All Statuses
            </button>
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedStatus === s
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span> of {records.length.toLocaleString()} records
        </p>

        <ApexTable records={filtered} />
      </main>
    </div>
  );
}
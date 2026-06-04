import React, { useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, BookOpen, LayoutGrid, Download, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApexTable from "@/components/apex/ApexTable";
import ApexStatsBar from "@/components/apex/ApexStatsBar";
import ApexSummaryBox from "@/components/apex/ApexSummaryBox";
import ApexImportDialog from "@/components/apex/ApexImportDialog";

export default function ApexDatabase() {
  const [selectedState, setSelectedState] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["apex-records"],
    queryFn: () => base44.entities.ApexRecord.list("-created_date", 10000),
  });

  const sourceFiles = useMemo(() => {
    const set = new Set(records.map((r) => r.source_file).filter(Boolean));
    return Array.from(set).sort();
  }, [records]);

  const tabRecords = useMemo(() => {
    if (activeTab === "all") return records;
    return records.filter((r) => r.source_file === activeTab);
  }, [records, activeTab]);

  const stateOptions = useMemo(() => {
    const counts = {};
    tabRecords.forEach((r) => {
      const st = r.state || "—";
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
  }, [tabRecords]);

  const statusOptions = useMemo(() => {
    const set = new Set(tabRecords.map((r) => r.status).filter(Boolean));
    return Array.from(set).sort();
  }, [tabRecords]);

  const filtered = useMemo(() => {
    let result = tabRecords;
    if (selectedState !== "all") result = result.filter((r) => r.state === selectedState);
    if (selectedStatus !== "all") result = result.filter((r) => r.status === selectedStatus);
    return result;
  }, [tabRecords, selectedState, selectedStatus]);

  const handleToggleRow = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((visibleRecords) => {
    const allSelected = visibleRecords.every((r) => selectedIds.has(r.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleRecords.forEach((r) => next.delete(r.id));
      } else {
        visibleRecords.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }, [selectedIds]);

  const handleBulkStatus = async (newStatus) => {
    setBulkUpdating(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        base44.entities.ApexRecord.update(id, { status: newStatus })
      )
    );
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["apex-records"] });
    setBulkUpdating(false);
  };

  const exportCSV = () => {
    const headers = ["Employer Name", "City", "State", "TPA Name", "Status", "Classification", "Platform", "# Employees", "Source File"];
    const rows = filtered.map((r) => [
      r.employer_name, r.city, r.state, r.tpa_name, r.status,
      r.classification, r.platform, r.num_employees, r.source_file,
    ].map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apex-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <Button variant="outline" className="gap-2" onClick={exportCSV}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <ApexImportDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <ApexStatsBar records={records} />
        <ApexSummaryBox records={records} />

        {/* Source Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedState("all"); setSelectedStatus("all"); setSelectedIds(new Set()); }}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted p-1 rounded-lg">
            <TabsTrigger value="all" className="text-xs">All Sources ({records.length})</TabsTrigger>
            {sourceFiles.map((sf) => (
              <TabsTrigger key={sf} value={sf} className="text-xs max-w-[200px] truncate">
                {sf.replace(/\.xlsx?$/i, "")} ({records.filter((r) => r.source_file === sf).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {stateOptions.map(({ name, count }) => (
                <SelectItem key={name} value={name}>{name} ({count})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-3">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                variant="outline"
                disabled={bulkUpdating}
                onClick={() => handleBulkStatus("Qualified")}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Mark Qualified
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bulkUpdating}
                onClick={() => handleBulkStatus("Pending")}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                Mark Pending
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length.toLocaleString()}</span> of {records.length.toLocaleString()} records
        </p>

        <ApexTable
          records={filtered}
          selectedIds={selectedIds}
          onToggleRow={handleToggleRow}
          onToggleAll={handleToggleAll}
        />
      </main>
    </div>
  );
}
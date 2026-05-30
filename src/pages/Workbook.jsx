import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, LayoutGrid } from "lucide-react";
import { Link } from "react-router-dom";
import StateFilter from "../components/workbook/StateFilter";
import DistrictTable from "../components/workbook/DistrictTable";
import AddDistrictDialog from "../components/workbook/AddDistrictDialog";
import StatsBar from "../components/workbook/StatsBar";
import ExportButton from "../components/workbook/ExportButton";
import CSVUploadDialog from "../components/workbook/CSVUploadDialog";

export default function Workbook() {
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("all");

  const { data: districts = [], isLoading } = useQuery({
    queryKey: ["school-districts"],
    queryFn: () => base44.entities.SchoolDistrict.list("-created_date", 5000),
  });

  const filtered = useMemo(() => {
    let result = districts;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.district_name?.toLowerCase().includes(q) ||
          d.website_url?.toLowerCase().includes(q) ||
          d.staff_directory_url?.toLowerCase().includes(q)
      );
    }
    if (selectedState !== "all") {
      result = result.filter((d) => (d.state || "TX") === selectedState);
    }
    return result;
  }, [districts, search, selectedState]);

  const stateGroups = useMemo(() => {
    const groups = {};
    filtered.forEach((d) => {
      const st = d.state || "TX";
      if (!groups[st]) groups[st] = [];
      groups[st].push(d);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, items]) => ({ name, districts: items }));
  }, [filtered]);

  const stateOptions = useMemo(() => {
    const counts = {};
    districts.forEach((d) => {
      const st = d.state || "TX";
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  }, [districts]);

  const visibleCount = districts.filter((d) => d.visibility === "Yes").length;

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
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
                School District Workbook
              </h1>
              <p className="text-sm text-muted-foreground">
                Staff directories & district data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/kanban">
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Pipeline Board
              </Button>
            </Link>
            <ExportButton districts={filtered} />
            <CSVUploadDialog />
            <AddDistrictDialog />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats */}
        <StatsBar
          totalDistricts={districts.length}
          totalStates={stateOptions.length}
          visibleCount={visibleCount}
        />

        {/* Search + Filter */}
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search districts..."
              className="pl-10"
            />
          </div>
          <StateFilter
            states={stateOptions}
            selectedState={selectedState}
            onSelect={setSelectedState}
          />
        </div>

        {/* Tables by State */}
        <div className="space-y-6">
          {stateGroups.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No districts found</p>
              <p className="text-sm mt-1">Try adjusting your search or filter</p>
            </div>
          ) : (
            stateGroups.map((group) => (
              <DistrictTable
                key={group.name}
                stateName={group.name}
                districts={group.districts}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
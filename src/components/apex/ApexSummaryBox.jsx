import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

export default function ApexSummaryBox({ records }) {
  const activeCount = records.filter((r) => r.status === "Active").length;

  const byState = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const st = r.state || "Unknown";
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [records]);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-6 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Records</p>
          <p className="text-2xl font-bold text-foreground">{records.length.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">States</p>
          <p className="text-2xl font-bold text-primary">{byState.length}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Records by State</p>
        <div className="flex flex-wrap gap-2">
          {byState.map(([state, count]) => (
            <div key={state} className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs font-medium">{state}</Badge>
              <span className="text-xs text-muted-foreground">{count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
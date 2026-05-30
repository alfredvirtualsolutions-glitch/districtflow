import React from "react";
import { Database, MapPin, Building2, Users } from "lucide-react";

export default function ApexStatsBar({ records }) {
  const totalStates = new Set(records.map((r) => r.state).filter(Boolean)).size;
  const totalTPAs = new Set(records.map((r) => r.tpa_name).filter(Boolean)).size;
  const activeCount = records.filter((r) => r.status === "Active").length;

  const stats = [
    { label: "Total Records", value: records.length.toLocaleString(), icon: Database, color: "text-accent" },
    { label: "States", value: totalStates, icon: MapPin, color: "text-primary" },
    { label: "Unique TPAs", value: totalTPAs, icon: Building2, color: "text-chart-3" },
    { label: "Active", value: activeCount.toLocaleString(), icon: Users, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
          <div className={`p-2 rounded-lg bg-muted ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
import React from "react";
import { Building2, Globe, Eye, MapPin } from "lucide-react";

export default function StatsBar({ totalDistricts, totalStates, visibleCount }) {
  const stats = [
    { label: "Total Districts", value: totalDistricts, icon: Building2, color: "text-primary" },
    { label: "States", value: totalStates, icon: MapPin, color: "text-accent" },
    { label: "Visible Staff", value: visibleCount, icon: Eye, color: "text-green-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-4 bg-card rounded-xl border border-border p-5 shadow-sm"
        >
          <div className={`p-3 rounded-lg bg-muted ${s.color}`}>
            <s.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

const statusColors = {
  Active: "border-green-300 text-green-700 bg-green-50",
  Dormant: "border-gray-300 text-gray-600 bg-gray-50",
  "Low Prod": "border-yellow-300 text-yellow-700 bg-yellow-50",
  "Open Slot": "border-blue-300 text-blue-700 bg-blue-50",
};

export default function ApexTable({ records }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border border-border rounded-xl bg-card">
        <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">No records found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-muted/70">
              <TableHead className="font-semibold">Employer / School District</TableHead>
              <TableHead className="font-semibold">City</TableHead>
              <TableHead className="font-semibold">State</TableHead>
              <TableHead className="font-semibold">TPA Name</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Classification</TableHead>
              <TableHead className="font-semibold">Platform</TableHead>
              <TableHead className="font-semibold text-right"># EEs</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium max-w-[260px] truncate">{r.employer_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.city || "—"}</TableCell>
                <TableCell>
                  {r.state && (
                    <Badge variant="outline" className="text-xs">{r.state}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm max-w-[180px] truncate">{r.tpa_name || "—"}</TableCell>
                <TableCell>
                  {r.status && (
                    <Badge variant="outline" className={`text-xs ${statusColors[r.status] || "border-border"}`}>
                      {r.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{r.classification || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.platform || "—"}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{r.num_employees || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{r.source_file || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
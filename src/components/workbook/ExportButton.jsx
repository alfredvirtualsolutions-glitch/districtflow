import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

function exportToCSV(districts) {
  const headers = ["District Name", "State", "Website", "Staff Directory URL", "Visibility", "Teachers Visible", "District Size", "Contact Email", "Phone", "Enrollment", "Notes"];
  const rows = districts.map((d) => [
    d.district_name || "",
    d.state || "",
    d.website_url || "",
    d.staff_directory_url || "",
    d.visibility || "",
    d.num_teachers_visible || "",
    d.district_size || "",
    d.contact_email || "",
    d.phone || "",
    d.enrollment || "",
    (d.notes || "").replace(/\n/g, " "),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "school_districts.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(districts) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("School District Workbook", 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleDateString()} — ${districts.length} districts`, 14, 23);

  const grouped = {};
  districts.forEach((d) => {
    const st = d.state || "TX";
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(d);
  });

  let y = 30;
  Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([state, rows]) => {
    if (y > 170) { doc.addPage(); y = 16; }
    doc.setFontSize(12);
    doc.setTextColor(30, 90, 180);
    doc.text(`${state} (${rows.length})`, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    doc.autoTable({
      startY: y,
      head: [["District Name", "Website", "Staff Directory", "Visibility", "Teachers"]],
      body: rows.map((d) => [
        d.district_name || "",
        d.website_url || "",
        d.staff_directory_url || "",
        d.visibility || "",
        d.num_teachers_visible || "",
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 90, 180] },
      margin: { left: 14, right: 14 },
      theme: "striped",
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  doc.save("school_districts.pdf");
}

export default function ExportButton({ districts }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { exportToCSV(districts); setOpen(false); }}>
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { exportToPDF(districts); setOpen(false); }}>
          <FileText className="w-4 h-4 mr-2 text-red-500" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
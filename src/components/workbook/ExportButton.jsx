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
  const pageW = doc.internal.pageSize.getWidth();
  const cols = [
    { header: "District Name", width: 70 },
    { header: "State", width: 14 },
    { header: "Website", width: 55 },
    { header: "Staff Directory", width: 55 },
    { header: "Visibility", width: 20 },
    { header: "Teachers", width: 22 },
  ];
  const margin = 14;
  const rowH = 7;
  const headerH = 8;

  doc.setFontSize(16);
  doc.text("School District Workbook", margin, 16);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exported ${new Date().toLocaleDateString()} · ${districts.length} districts`, margin, 23);
  doc.setTextColor(0, 0, 0);

  let y = 30;

  const drawHeader = () => {
    doc.setFillColor(30, 90, 180);
    doc.rect(margin, y, pageW - margin * 2, headerH, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = margin + 2;
    cols.forEach(({ header, width }) => {
      doc.text(header, x, y + 5.5);
      x += width;
    });
    doc.setTextColor(0, 0, 0);
    y += headerH;
  };

  const drawRow = (d, shade) => {
    if (y > 190) { doc.addPage(); y = 16; drawHeader(); }
    if (shade) { doc.setFillColor(245, 247, 252); doc.rect(margin, y, pageW - margin * 2, rowH, "F"); }
    doc.setFontSize(7.5);
    let x = margin + 2;
    const cells = [
      d.district_name || "",
      d.state || "",
      d.website_url || "",
      d.staff_directory_url || "",
      d.visibility || "",
      d.num_teachers_visible || "",
    ];
    cols.forEach(({ width }, i) => {
      const text = doc.splitTextToSize(cells[i], width - 3)[0] || "";
      doc.text(text, x, y + 4.8);
      x += width;
    });
    y += rowH;
  };

  const grouped = {};
  districts.forEach((d) => {
    const st = d.state || "TX";
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(d);
  });

  Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).forEach(([state, rows]) => {
    if (y > 185) { doc.addPage(); y = 16; }
    doc.setFontSize(11);
    doc.setTextColor(30, 90, 180);
    doc.text(`${state}  (${rows.length})`, margin, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 10;
    drawHeader();
    rows.forEach((d, i) => drawRow(d, i % 2 === 0));
    y += 6;
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
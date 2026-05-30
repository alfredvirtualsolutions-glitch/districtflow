import React, { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const ENTITY_FIELDS = [
  { key: "district_name", label: "District Name *" },
  { key: "state", label: "State" },
  { key: "website_url", label: "Website URL" },
  { key: "staff_directory_url", label: "Staff Directory URL" },
  { key: "visibility", label: "Visibility (Yes/No)" },
  { key: "num_teachers_visible", label: "# Teachers Visible" },
  { key: "district_size", label: "District Size" },
  { key: "contact_email", label: "Contact Email" },
  { key: "phone", label: "Phone" },
  { key: "enrollment", label: "Enrollment" },
  { key: "notes", label: "Notes" },
];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) =>
    h.replace(/^"|"$/g, "").trim()
  );
  const rows = lines.slice(1).map((line) => {
    const vals = [];
    let inQ = false, cur = "";
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { vals.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    vals.push(cur.trim());
    return vals;
  });
  return { headers, rows };
}

function autoMap(headers) {
  const mapping = {};
  const lh = headers.map((h) => h.toLowerCase());
  ENTITY_FIELDS.forEach(({ key }) => {
    const idx = lh.findIndex((h) =>
      h.includes(key.replace(/_/g, " ")) ||
      h.includes(key.replace(/_/g, "")) ||
      (key === "district_name" && h.includes("district")) ||
      (key === "website_url" && h.includes("website")) ||
      (key === "staff_directory_url" && (h.includes("staff") || h.includes("directory"))) ||
      (key === "visibility" && h.includes("visibility")) ||
      (key === "num_teachers_visible" && (h.includes("teacher") || h.includes("number")))
    );
    if (idx !== -1) mapping[key] = idx;
  });
  return mapping;
}

export default function CSVUploadDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("upload"); // upload | map | done
  const [parsed, setParsed] = useState(null);
  const [mapping, setMapping] = useState({});
  const [defaultState, setDefaultState] = useState("TX");
  const [status, setStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = parseCSV(e.target.result);
      setParsed(result);
      setMapping(autoMap(result.headers));
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setStatus(null);

    const records = parsed.rows
      .filter((row) => row.some((v) => v))
      .map((row) => {
        const rec = { state: defaultState };
        ENTITY_FIELDS.forEach(({ key }) => {
          if (mapping[key] !== undefined && row[mapping[key]] !== undefined) {
            rec[key] = row[mapping[key]] || "";
          }
        });
        return rec;
      })
      .filter((r) => r.district_name);

    let created = 0;
    for (let i = 0; i < records.length; i += 50) {
      await base44.entities.SchoolDistrict.bulkCreate(records.slice(i, i + 50));
      created += Math.min(50, records.length - i);
    }

    queryClient.invalidateQueries({ queryKey: ["school-districts"] });
    setImporting(false);
    setStatus({ success: true, count: created });
    setStep("done");
  };

  const reset = () => {
    setParsed(null);
    setMapping({});
    setStatus(null);
    setStep("upload");
    setDefaultState("TX");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Import Districts from CSV</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="mt-4 border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("csv-file-input").click()}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-foreground">Drop your CSV here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">First row must be column headers</p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
            />
          </div>
        )}

        {step === "map" && parsed && (
          <div className="mt-4 space-y-5">
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              Detected <strong>{parsed.headers.length}</strong> columns and <strong>{parsed.rows.length}</strong> rows.
              Map your CSV columns to district fields below.
            </div>

            <div className="space-y-1.5">
              <Label>Default State (used if no state column mapped)</Label>
              <input
                className="border border-input rounded-md px-3 py-2 text-sm w-24"
                value={defaultState}
                onChange={(e) => setDefaultState(e.target.value.toUpperCase().slice(0, 2))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ENTITY_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Select
                    value={mapping[key] !== undefined ? String(mapping[key]) : "__none__"}
                    onValueChange={(v) => {
                      const next = { ...mapping };
                      if (v === "__none__") delete next[key];
                      else next[key] = Number(v);
                      setMapping(next);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="— skip —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— skip —</SelectItem>
                      {parsed.headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {parsed.rows[0] && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold mb-2">Preview (first row):</p>
                {ENTITY_FIELDS.filter(({ key }) => mapping[key] !== undefined).map(({ key, label }) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-muted-foreground w-32">{label}:</span>
                    <span className="font-medium truncate">{parsed.rows[0][mapping[key]] || "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">Back</Button>
              <Button
                onClick={handleImport}
                disabled={importing || !mapping.district_name}
                className="flex-1 gap-2"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? "Importing..." : `Import ${parsed.rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="mt-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-lg font-semibold">
              {status?.count} districts imported successfully!
            </p>
            <Button onClick={() => { reset(); setOpen(false); }} className="w-full">Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
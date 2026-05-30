import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function ApexImportDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const queryClient = useQueryClient();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setLoading(true);
    setResults(null);
    const summary = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            records: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employer_name: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  tpa_name: { type: "string" },
                  status: { type: "string" },
                  group_type: { type: "string" },
                  classification: { type: "string" },
                  num_employees: { type: "string" },
                  platform: { type: "string" },
                },
              },
            },
          },
        },
      });

      const rows = (extracted.output?.records || []).filter((r) => r.employer_name);
      const toCreate = rows.map((r) => ({ ...r, source_file: file.name }));

      if (toCreate.length > 0) {
        await base44.entities.ApexRecord.bulkCreate(toCreate);
      }
      summary.push({ file: file.name, count: toCreate.length });
    }

    queryClient.invalidateQueries({ queryKey: ["apex-records"] });
    setResults(summary);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-accent hover:bg-accent/90">
          <Upload className="w-4 h-4" />
          Import Files
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Apex Data Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!loading && !results && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-muted/30 transition-colors gap-3">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-center text-muted-foreground">
                Click to select one or more XLSX files to import
              </p>
              <input type="file" accept=".xlsx,.csv" multiple className="hidden" onChange={handleFiles} />
            </label>
          )}

          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Importing records…</p>
            </div>
          )}

          {results && (
            <div className="space-y-2">
              {results.map(({ file, count }) => (
                <div key={file} className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="truncate text-green-800">{file}</span>
                  <span className="ml-auto font-semibold text-green-700">{count} records</span>
                </div>
              ))}
              <Button className="w-full mt-2" onClick={() => { setResults(null); setOpen(false); }}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
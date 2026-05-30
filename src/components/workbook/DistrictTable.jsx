import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function DistrictTable({ stateName, districts }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await base44.entities.SchoolDistrict.delete(id);
    queryClient.invalidateQueries({ queryKey: ["school-districts"] });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold font-display text-foreground">
            {stateName}
          </h3>
          <Badge className="bg-primary/10 text-primary border-primary/20 border">
            {districts.length} districts
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">District Name</TableHead>
                    <TableHead className="font-semibold">Website</TableHead>
                    <TableHead className="font-semibold">Staff Directory</TableHead>
                    <TableHead className="font-semibold text-center">Visibility</TableHead>
                    <TableHead className="font-semibold text-center">Teachers</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {districts.map((d) => (
                    <TableRow
                      key={d.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {d.district_name}
                      </TableCell>
                      <TableCell>
                        {d.website_url && (
                          <a
                            href={d.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">Visit</span>
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.staff_directory_url && (
                          <a
                            href={d.staff_directory_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent/80 flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">Directory</span>
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            d.visibility === "Yes"
                              ? "border-green-300 text-green-700 bg-green-50"
                              : "border-red-300 text-red-700 bg-red-50"
                          }
                        >
                          {d.visibility || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {d.num_teachers_visible || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(d.id, e)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
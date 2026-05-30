import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Save, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

export default function DistrictDetailDrawer({ district, onClose }) {
  const [form, setForm] = useState(district || {});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.SchoolDistrict.update(district.id, form);
    queryClient.invalidateQueries({ queryKey: ["school-districts"] });
    setSaving(false);
    onClose();
  };

  if (!district) return null;

  return (
    <Sheet open={!!district} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="font-display text-lg leading-tight pr-6">
            {district.district_name}
          </SheetTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {district.state && (
              <Badge className="bg-primary/10 text-primary border-primary/20 border">
                {district.state}
              </Badge>
            )}
            {district.visibility && (
              <Badge
                variant="outline"
                className={district.visibility === "Yes"
                  ? "border-green-300 text-green-700 bg-green-50"
                  : "border-red-300 text-red-700 bg-red-50"}
              >
                Visible: {district.visibility}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Quick links */}
        <div className="flex gap-2 mb-6">
          {district.website_url && (
            <a href={district.website_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Website
              </Button>
            </a>
          )}
          {district.staff_directory_url && (
            <a href={district.staff_directory_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <ExternalLink className="w-3.5 h-3.5" /> Staff Directory
              </Button>
            </a>
          )}
        </div>

        <div className="space-y-4">
          {/* Core info */}
          <div className="space-y-1.5">
            <Label>District Name</Label>
            <Input value={form.district_name || ""} onChange={(e) => set("district_name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state || ""} onChange={(e) => set("state", e.target.value.toUpperCase().slice(0, 2))} maxLength={2} />
            </div>
            <div className="space-y-1.5">
              <Label>District Size</Label>
              <Select value={form.district_size || "Unknown"} onValueChange={(v) => set("district_size", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Small">Small</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Large">Large</SelectItem>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input value={form.website_url || ""} onChange={(e) => set("website_url", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Staff Directory URL</Label>
            <Input value={form.staff_directory_url || ""} onChange={(e) => set("staff_directory_url", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={form.visibility || "Yes"} onValueChange={(v) => set("visibility", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Teachers Visible</Label>
              <Input value={form.num_teachers_visible || ""} onChange={(e) => set("num_teachers_visible", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Enrollment</Label>
              <Input placeholder="e.g. 5,000" value={form.enrollment || ""} onChange={(e) => set("enrollment", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="(512) 555-1234" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Contact Email</Label>
            <Input type="email" placeholder="info@district.edu" value={form.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Research Notes</Label>
            <Textarea
              placeholder="Add your personal notes about this district..."
              className="min-h-[120px] resize-none"
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="pt-6 border-t mt-6">
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
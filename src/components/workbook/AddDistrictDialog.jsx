import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
];

export default function AddDistrictDialog() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    district_name: "",
    state: "TX",
    website_url: "",
    staff_directory_url: "",
    visibility: "Yes",
    num_teachers_visible: "Multiple",
  });

  const handleSave = async () => {
    if (!form.district_name.trim()) return;
    setSaving(true);
    await base44.entities.SchoolDistrict.create(form);
    queryClient.invalidateQueries({ queryKey: ["school-districts"] });
    setForm({
      district_name: "",
      state: "TX",
      website_url: "",
      staff_directory_url: "",
      visibility: "Yes",
      num_teachers_visible: "Multiple",
    });
    setSaving(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
          <Plus className="w-4 h-4" />
          Add District
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add New District</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>District Name *</Label>
            <Input
              value={form.district_name}
              onChange={(e) => setForm({ ...form, district_name: e.target.value })}
              placeholder="e.g. Springfield ISD"
            />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Website URL</Label>
            <Input
              value={form.website_url}
              onChange={(e) => setForm({ ...form, website_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Staff Directory URL</Label>
            <Input
              value={form.staff_directory_url}
              onChange={(e) => setForm({ ...form, staff_directory_url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Teachers Visible</Label>
              <Input
                value={form.num_teachers_visible}
                onChange={(e) => setForm({ ...form, num_teachers_visible: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || !form.district_name.trim()} className="w-full">
            {saving ? "Saving..." : "Save District"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
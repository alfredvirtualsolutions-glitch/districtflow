import React, { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Mail, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SMTP_ACCOUNTS = [
  "benefitcheck@benefitview.us",
  "clarityreview@benefitview.us",
  "notification@benefitview.us",
  "educators@403bclarity.org",
  "ryan@403bclarity.org",
];

const DEFAULT_FROM_NAME = "Ryan Cahill";

const DEFAULT_SUBJECT = "Complimentary Pension Review — {{district_name}}";

const DEFAULT_BODY = `Hi {{first_name}},

My name is Ryan Cahill and I help educate CalSTRS and CalPERS employees with regards to the California State Teachers Retirement System Pension Benefits Plan.

I am currently meeting virtually with educators in {{district_name}}.

During our meeting, we will cover the following agenda items:
● When is the soonest you are eligible to retire?
● How much is your pension going to pay you?
● Do you qualify for social security benefits?
● Do you get both a pension and social security?
● How much income will your 403b or 457 provide you in retirement?

Here is my calendar link to select a day & time that works best for you.

Complimentary Pension Review

This service is part of a state-approved financial education program for school employees. While we're not affiliated with CalSTRS or your district, we're here to help you make informed, confident decisions about your retirement.

I look forward to helping you!

Ryan Cahill
Pension & Retirement Specialist
Phone No: 614-806-0233
CA Lic. 0156729
ryan@meetryancahill.com`;

export default function SendEmailDialog({ districts = [] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState("compose"); // compose | sending | results
  const [form, setForm] = useState({
    from_name: DEFAULT_FROM_NAME,
    from_email: SMTP_ACCOUNTS[0],
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
  });
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const recipients = useMemo(
    () => districts.filter((d) => d.contact_email?.trim()),
    [districts]
  );

  const handleSend = async () => {
    if (!form.subject.trim() || !form.body.trim() || recipients.length === 0) return;

    setStep("sending");
    setProgress(0);

    try {
      const payload = {
        recipients: recipients.map((d) => ({
          email: d.contact_email,
          first_name: d.first_name || "",
          district_name: d.district_name || "",
          state: d.state || "",
        })),
        subject: form.subject,
        body: form.body,
        from_name: form.from_name || DEFAULT_FROM_NAME,
        from_email: form.from_email,
      };

      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 15, 90));
      }, 600);

      const result = await base44.functions.sendBatchEmails(payload);

      clearInterval(progressInterval);
      setProgress(100);
      setResults(result);
      setStep("results");
    } catch (err) {
      setResults({ error: err.message || "Send failed" });
      setStep("results");
    }
  };

  const reset = () => {
    setStep("compose");
    setProgress(0);
    setResults(null);
    setForm({ from_name: DEFAULT_FROM_NAME, from_email: SMTP_ACCOUNTS[0], subject: DEFAULT_SUBJECT, body: DEFAULT_BODY });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="w-4 h-4" />
          Send Email
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Batch Email</DialogTitle>
        </DialogHeader>

        {/* ── Compose ───────────────────────────────────────── */}
        {step === "compose" && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>
                <strong>{recipients.length}</strong> of {districts.length} districts have a contact email
              </span>
            </div>

            {recipients.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                No contact emails found in the current filter. Add emails to districts first.
              </div>
            )}

            {/* Sender identity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sender Name</Label>
                <Input
                  value={form.from_name}
                  onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                  placeholder="Ryan Cahill"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Send From Account</Label>
                <Select
                  value={form.from_email}
                  onValueChange={(v) => setForm({ ...form, from_email: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMTP_ACCOUNTS.map((acct) => (
                      <SelectItem key={acct} value={acct}>
                        {acct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Complimentary Pension Review — {{district_name}}"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Body *</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={"Hi,\n\nI'm reaching out to {{district_name}} in {{state}}...\n\nBest,\nRyan Cahill"}
                rows={10}
                className="font-mono text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{first_name}}"}</code>,{" "}
                <code className="bg-muted px-1 rounded">{"{{district_name}}"}</code>, or{" "}
                <code className="bg-muted px-1 rounded">{"{{state}}"}</code> for personalization.
              </p>
            </div>

            <Button
              onClick={handleSend}
              disabled={!form.subject.trim() || !form.body.trim() || recipients.length === 0}
              className="w-full gap-2"
            >
              <Mail className="w-4 h-4" />
              Send to {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
            </Button>
          </div>
        )}

        {/* ── Sending ───────────────────────────────────────── */}
        {step === "sending" && (
          <div className="mt-8 space-y-6 text-center pb-4">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="font-semibold">Sending emails…</p>
              <p className="text-sm text-muted-foreground">
                Sending to {recipients.length} recipients from {form.from_email}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Please wait — do not close this dialog</p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────── */}
        {step === "results" && (
          <div className="mt-4 space-y-4">
            {results?.error ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <XCircle className="w-10 h-10 text-destructive" />
                <p className="font-semibold text-destructive">Send failed</p>
                <p className="text-sm text-muted-foreground text-center">{results.error}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      {results?.sent} email{results?.sent !== 1 ? "s" : ""} sent successfully
                    </p>
                    {results?.failed?.length > 0 && (
                      <p className="text-sm text-amber-600">
                        {results.failed.length} failed
                      </p>
                    )}
                  </div>
                </div>

                {results?.failed?.length > 0 && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-destructive mb-2">Failed deliveries:</p>
                    {results.failed.map((f, i) => (
                      <div key={i} className="text-xs flex gap-2">
                        <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                        <span>
                          <span className="font-medium">{f.email}</span>
                          {f.error && <span className="text-muted-foreground"> — {f.error}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">
                Send Another
              </Button>
              <Button onClick={() => { reset(); setOpen(false); }} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

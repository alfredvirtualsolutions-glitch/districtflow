import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/api/supabaseClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Activity, CheckSquare, TrendingUp,
  Search, BookOpen, LayoutGrid, Mail,
  Plus, Circle, AlertCircle, Clock, CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

// ── helpers ───────────────────────────────────────────────────────────────

const STAGE_COLORS = {
  sourced:      "bg-slate-100 text-slate-700",
  prospecting:  "bg-blue-100 text-blue-700",
  qualified:    "bg-purple-100 text-purple-700",
  proposal:     "bg-amber-100 text-amber-700",
  negotiation:  "bg-orange-100 text-orange-700",
  closed_won:   "bg-green-100 text-green-700",
  closed_lost:  "bg-red-100 text-red-700",
};

const PRIORITY_ICON = {
  low:    <Circle className="w-3 h-3 text-slate-400" />,
  normal: <Circle className="w-3 h-3 text-blue-400" />,
  high:   <AlertCircle className="w-3 h-3 text-amber-500" />,
  urgent: <AlertCircle className="w-3 h-3 text-red-500" />,
};

const ACTIVITY_ICON = {
  note:           <Activity className="w-4 h-4 text-slate-500" />,
  email:          <Mail className="w-4 h-4 text-blue-500" />,
  call:           <Clock className="w-4 h-4 text-green-500" />,
  meeting:        <Users className="w-4 h-4 text-purple-500" />,
  task_completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  status_change:  <TrendingUp className="w-4 h-4 text-amber-500" />,
};

function fmt(ts) {
  if (!ts) return "—";
  return format(new Date(ts), "MMM d, yyyy");
}

// ── Leads tab ─────────────────────────────────────────────────────────────

function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");

  useEffect(() => {
    supabase
      .from("leads")
      .select("id,full_name,email,title,organization,district_name,state,lifecycle_stage,email_status,send_status,sent_at,hot_reply,reply_status,created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!error) setLeads(data || []);
        setLoading(false);
      });
  }, []);

  const stages = useMemo(() => {
    const s = new Set(leads.map((l) => l.lifecycle_stage).filter(Boolean));
    return ["all", ...s];
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const matchesSearch =
        !q ||
        l.full_name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.district_name?.toLowerCase().includes(q) ||
        l.organization?.toLowerCase().includes(q);
      const matchesStage = stage === "all" || l.lifecycle_stage === stage;
      return matchesSearch && matchesStage;
    });
  }, [leads, search, stage]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1">
          {stages.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                stage === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {s === "all" ? `All (${leads.length})` : s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              {["Name","Email","Title","District","State","Stage","Email Status","Sent","Hot"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">No leads found</td></tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{l.full_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-40">{l.email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.title || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{l.district_name || l.organization || "—"}</td>
                  <td className="px-3 py-2 text-center">{l.state || "—"}</td>
                  <td className="px-3 py-2">
                    {l.lifecycle_stage ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[l.lifecycle_stage] || "bg-muted text-muted-foreground"}`}>
                        {l.lifecycle_stage}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{l.email_status || l.send_status || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmt(l.sent_at)}</td>
                  <td className="px-3 py-2 text-center">
                    {l.hot_reply ? <span className="text-red-500 text-sm">🔥</span> : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {leads.length} leads</p>
    </div>
  );
}

// ── Activities tab ────────────────────────────────────────────────────────

function ActivitiesTab() {
  const [activities, setActivities] = useState([]);
  const [emailLog, setEmailLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("crm_activities")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase
        .from("district_email_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100),
    ]).then(([{ data: acts }, { data: emails }]) => {
      setActivities(acts || []);
      setEmailLog(emails || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  const emailItems = emailLog.map((e) => ({
    id: e.id,
    activity_type: "email",
    title: e.subject,
    body: `To: ${e.recipient_email} · From: ${e.from_account} · ${e.status}`,
    district_name: e.district_name,
    occurred_at: e.sent_at,
  }));

  const all = [...activities, ...emailItems].sort(
    (a, b) => new Date(b.occurred_at) - new Date(a.occurred_at)
  );

  return (
    <div className="space-y-3">
      {all.length === 0 ? (
        <EmptyState icon={<Activity className="w-10 h-10" />} text="No activities yet" />
      ) : (
        all.map((a) => (
          <div key={a.id} className="flex gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
            <div className="mt-0.5 shrink-0">{ACTIVITY_ICON[a.activity_type] || <Activity className="w-4 h-4" />}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm truncate">{a.title || a.activity_type}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{fmt(a.occurred_at)}</span>
              </div>
              {a.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.body}</p>}
              {a.district_name && (
                <span className="text-xs text-primary mt-1 inline-block">{a.district_name}</span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────────────────

function TasksTab() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");

  const reload = () => {
    supabase
      .from("crm_tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(200)
      .then(({ data }) => { setTasks(data || []); setLoading(false); });
  };

  useEffect(() => { reload(); }, []);

  const markDone = async (id) => {
    await supabase.from("crm_tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", id);
    reload();
  };

  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        {["open","in_progress","done","all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            {" "}({tasks.filter((t) => s === "all" || t.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={<CheckSquare className="w-10 h-10" />} text="No tasks" />
        ) : (
          filtered.map((t) => (
            <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${t.status === "done" ? "opacity-50 bg-muted/20" : "bg-card border-border hover:bg-muted/30"}`}>
              <button
                onClick={() => t.status !== "done" && markDone(t.id)}
                className="mt-0.5 shrink-0"
                title="Mark done"
              >
                {t.status === "done"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Circle className="w-4 h-4 text-muted-foreground hover:text-emerald-500 transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-medium text-sm ${t.status === "done" ? "line-through" : ""}`}>{t.title}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {PRIORITY_ICON[t.priority]}
                    {t.due_date && (
                      <span className={`text-xs ${new Date(t.due_date) < new Date() && t.status !== "done" ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {fmt(t.due_date)}
                      </span>
                    )}
                  </div>
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                {t.district_name && <span className="text-xs text-primary">{t.district_name}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Deals tab ─────────────────────────────────────────────────────────────

const DEAL_STAGES = ["prospecting","qualified","proposal","negotiation","closed_won","closed_lost"];

function DealsTab() {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("crm_deals")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDeals(data || []); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  const byStage = DEAL_STAGES.reduce((acc, s) => {
    acc[s] = deals.filter((d) => d.stage === s);
    return acc;
  }, {});

  const totalValue = deals
    .filter((d) => d.stage !== "closed_lost")
    .reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{deals.length}</strong> deals</span>
        <span><strong className="text-foreground">${totalValue.toLocaleString()}</strong> pipeline value</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DEAL_STAGES.map((stage) => (
          <div key={stage} className="space-y-2">
            <div className={`text-xs font-semibold px-2 py-1 rounded text-center ${STAGE_COLORS[stage] || "bg-muted text-muted-foreground"}`}>
              {stage.replace("_", " ")} ({byStage[stage].length})
            </div>
            {byStage[stage].length === 0 ? (
              <div className="border border-dashed border-border rounded-lg h-16 flex items-center justify-center text-xs text-muted-foreground">Empty</div>
            ) : (
              byStage[stage].map((d) => (
                <div key={d.id} className="p-2.5 rounded-lg border border-border bg-card text-xs space-y-1">
                  <p className="font-medium line-clamp-2">{d.title}</p>
                  {d.district_name && <p className="text-muted-foreground truncate">{d.district_name}</p>}
                  {d.value && <p className="font-semibold text-primary">${Number(d.value).toLocaleString()}</p>}
                  {d.close_date && <p className="text-muted-foreground">{fmt(d.close_date)}</p>}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="w-12 h-12 mx-auto mb-4 opacity-30">{icon}</div>
      <p>{text}</p>
    </div>
  );
}

// ── Main CRM page ─────────────────────────────────────────────────────────

export default function CRM() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">CRM</h1>
              <p className="text-sm text-muted-foreground">Leads · Activities · Tasks · Deals</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Workbook
              </Button>
            </Link>
            <Link to="/kanban">
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Pipeline
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Tabs defaultValue="leads">
          <TabsList className="mb-6">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="w-4 h-4" /> Leads
            </TabsTrigger>
            <TabsTrigger value="activities" className="gap-2">
              <Activity className="w-4 h-4" /> Activities
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckSquare className="w-4 h-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="deals" className="gap-2">
              <TrendingUp className="w-4 h-4" /> Deals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads"><LeadsTab /></TabsContent>
          <TabsContent value="activities"><ActivitiesTab /></TabsContent>
          <TabsContent value="tasks"><TasksTab /></TabsContent>
          <TabsContent value="deals"><DealsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

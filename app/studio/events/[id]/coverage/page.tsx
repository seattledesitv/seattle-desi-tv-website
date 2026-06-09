"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../../lib/supabaseBrowser";
import { isAdminRole, isTeamRole, resolveUserRole } from "../../../../lib/roles";

const supabase = getSupabaseBrowserClient();

const DEFAULT_DELIVERABLES = [
  "Full Event Video",
  "Highlight Reel",
  "Interview Reel",
  "Sponsor Reel",
  "Photos",
  "Social Media Post",
];

function getEventIdFromPath() {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const eventsIndex = parts.indexOf("events");
  return eventsIndex >= 0 ? parts[eventsIndex + 1] || "" : "";
}

function shortDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export default function EventCoverageBriefPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading coverage brief...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [eventId, setEventId] = useState("");
  const [eventRow, setEventRow] = useState<any>(null);
  const [deliverables, setDeliverables] = useState<any[]>([]);
  const [form, setForm] = useState({ coverage_brief: "", required_shots: "", interview_targets: "", sponsor_requirements: "", special_instructions: "" });

  const canAccess = Boolean(user && (isAdminRole(role) || isTeamRole(role)));

  async function loadEvent(id: string) {
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,coverage_brief,required_shots,interview_targets,sponsor_requirements,special_instructions")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setActionMessage(`Could not load event coverage brief: ${error.message}`);
      return;
    }
    if (!data) {
      setActionMessage("Event not found.");
      return;
    }

    setEventRow(data);
    setForm({
      coverage_brief: data.coverage_brief || "",
      required_shots: data.required_shots || "",
      interview_targets: data.interview_targets || "",
      sponsor_requirements: data.sponsor_requirements || "",
      special_instructions: data.special_instructions || "",
    });
  }

  async function loadDeliverables(id: string) {
    const { data, error } = await supabase
      .from("event_deliverables")
      .select("*")
      .eq("event_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      setActionMessage(`Could not load deliverables: ${error.message}`);
      setDeliverables([]);
      return;
    }
    setDeliverables(data || []);
  }

  async function ensureDefaultDeliverables(id: string) {
    const { data } = await supabase.from("event_deliverables").select("deliverable_type").eq("event_id", id);
    const existing = new Set((data || []).map((row: any) => row.deliverable_type));
    const missing = DEFAULT_DELIVERABLES.filter((item) => !existing.has(item));
    if (!missing.length) return;
    await supabase.from("event_deliverables").insert(missing.map((deliverable_type) => ({ event_id: id, deliverable_type, required: true, completed: false })));
  }

  async function init() {
    setLoading(true);
    setActionMessage("");
    const id = getEventIdFromPath();
    setEventId(id);

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) {
      setRole("");
      setMessage("Please login to manage coverage briefs.");
      setLoading(false);
      return;
    }

    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!(isAdminRole(nextRole) || isTeamRole(nextRole))) {
      setMessage("You are logged in, but this account does not have coverage brief access.");
      setLoading(false);
      return;
    }

    if (id) {
      await ensureDefaultDeliverables(id);
      await Promise.all([loadEvent(id), loadDeliverables(id)]);
    }

    setMessage("");
    setLoading(false);
  }

  async function saveCoverageBrief() {
    if (!eventId) return;
    setActionMessage("Saving coverage brief...");
    const { error } = await supabase.from("events").update({
      coverage_brief: form.coverage_brief.trim(),
      required_shots: form.required_shots.trim(),
      interview_targets: form.interview_targets.trim(),
      sponsor_requirements: form.sponsor_requirements.trim(),
      special_instructions: form.special_instructions.trim(),
    }).eq("id", eventId);

    if (error) {
      setActionMessage(`Save failed: ${error.message}`);
      return;
    }
    setActionMessage("Coverage brief saved.");
    await loadEvent(eventId);
  }

  async function toggleDeliverable(row: any) {
    const nextCompleted = !row.completed;
    const { error } = await supabase.from("event_deliverables").update({
      completed: nextCompleted,
      completed_by: nextCompleted ? user?.id || null : null,
      completed_by_email: nextCompleted ? user?.email || null : null,
      completed_at: nextCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    if (error) {
      setActionMessage(`Could not update deliverable: ${error.message}`);
      return;
    }
    await loadDeliverables(eventId);
  }

  async function updateDeliverableNotes(row: any, notes: string) {
    setDeliverables((current) => current.map((item) => item.id === row.id ? { ...item, notes } : item));
    await supabase.from("event_deliverables").update({ notes, updated_at: new Date().toISOString() }).eq("id", row.id);
  }

  const completedCount = deliverables.filter((item) => item.completed).length;

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="max-w-6xl mx-auto px-6 py-10">
        <a href={eventId ? `/studio/events/${eventId}` : "/studio/events"} className="text-pink-300 font-bold">← Back to Event</a>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mt-5 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">Coverage Brief</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">{eventRow?.title || "Event Coverage"}</h1>
            <p className="text-slate-300 mt-2">{shortDate(eventRow?.date)}{eventRow?.location ? ` · ${eventRow.location}` : ""}</p>
            {user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p></div>}

        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

          <section className="bg-white text-slate-950 rounded-3xl p-6">
            <h2 className="text-2xl font-black">Coverage Brief</h2>
            <p className="text-gray-600 mt-1">This becomes the official handoff from producer/crew to the editor.</p>
            <div className="grid md:grid-cols-2 gap-4 mt-5">
              <label className="grid gap-2 text-sm font-bold md:col-span-2">Overall Brief<textarea className="border rounded-xl p-3 font-normal min-h-28" value={form.coverage_brief} onChange={(event) => setForm({ ...form, coverage_brief: event.target.value })} placeholder="Story angle, tone, event context, key message..." /></label>
              <label className="grid gap-2 text-sm font-bold">Required Shots<textarea className="border rounded-xl p-3 font-normal min-h-32" value={form.required_shots} onChange={(event) => setForm({ ...form, required_shots: event.target.value })} placeholder="Opening, crowd, stage, performances, booth, sponsor shots..." /></label>
              <label className="grid gap-2 text-sm font-bold">Interview Targets<textarea className="border rounded-xl p-3 font-normal min-h-32" value={form.interview_targets} onChange={(event) => setForm({ ...form, interview_targets: event.target.value })} placeholder="Organizer, chief guest, sponsor, artist, audience..." /></label>
              <label className="grid gap-2 text-sm font-bold">Sponsor Requirements<textarea className="border rounded-xl p-3 font-normal min-h-32" value={form.sponsor_requirements} onChange={(event) => setForm({ ...form, sponsor_requirements: event.target.value })} placeholder="Sponsor logo shots, booth footage, verbal credits..." /></label>
              <label className="grid gap-2 text-sm font-bold">Special Instructions<textarea className="border rounded-xl p-3 font-normal min-h-32" value={form.special_instructions} onChange={(event) => setForm({ ...form, special_instructions: event.target.value })} placeholder="Must include, publishing notes, sensitivities..." /></label>
            </div>
            <button onClick={saveCoverageBrief} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-black mt-5">Save Coverage Brief</button>
          </section>

          <section className="bg-white text-slate-950 rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div><h2 className="text-2xl font-black">Deliverables Checklist</h2><p className="text-gray-600 mt-1">Define what must be completed before this event content is considered done.</p></div>
              <div className="bg-slate-950 text-white px-5 py-3 rounded-xl font-black">{completedCount} / {deliverables.length} Complete</div>
            </div>
            <div className="grid gap-4 mt-5">
              {deliverables.map((row) => <article key={row.id} className="border rounded-2xl p-4 bg-slate-50"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><label className="flex items-center gap-3 font-black"><input type="checkbox" checked={Boolean(row.completed)} onChange={() => toggleDeliverable(row)} />{row.deliverable_type}</label><span className={`text-sm font-bold ${row.completed ? "text-green-700" : "text-gray-500"}`}>{row.completed ? "Completed" : "Pending"}</span></div><textarea value={row.notes || ""} onChange={(event) => updateDeliverableNotes(row, event.target.value)} placeholder="Notes for this deliverable..." className="border rounded-xl p-3 w-full mt-3 min-h-20" /></article>)}
              {deliverables.length === 0 && <div className="border border-dashed rounded-2xl p-5 text-gray-500">No deliverables found. Refresh to create defaults.</div>}
            </div>
          </section>
        </div>}
      </section>
    </main>
  );
}

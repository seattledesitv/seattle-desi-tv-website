"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(`${String(value).split("T")[0]}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

function statusClass(status?: string | null) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "approved") return "bg-green-100 text-green-800";
  if (normalized === "rejected") return "bg-red-100 text-red-800";
  if (normalized === "on_hold") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

function getImage(row: any) {
  if (Array.isArray(row?.image_urls) && row.image_urls.length > 0) return row.image_urls[0];
  return row?.image || "";
}

function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) return <div className="w-28 h-28 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>;
  return <img src={src} alt={label} className="w-28 h-28 rounded-xl object-cover bg-gray-100 border" />;
}

export default function StudioCrewPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const canAccess = Boolean(user && roleContainsAdmin(role));

  function getEventForAssignment(assignment: any) {
    return events.find((event) => event.id === assignment.event_id) || null;
  }

  async function loadCrewData() {
    const [eventResult, assignmentResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,date,location,status,image,image_urls,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("event_crew_assignments")
        .select("id,event_id,user_id,assignment_type,created_at,status,user_email,approved_by,approved_at,event_title")
        .order("created_at", { ascending: false }),
    ]);

    const errors = [];
    if (eventResult.error) errors.push(`Events: ${eventResult.error.message}`);
    else setEvents(eventResult.data || []);

    if (assignmentResult.error) errors.push(`Crew requests: ${assignmentResult.error.message}`);
    else setAssignments(assignmentResult.data || []);

    if (errors.length) setActionMessage(errors.join(" | "));
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setEvents([]);
      setAssignments([]);
      setMessage("Please login to access Studio Crew.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("You are logged in, but this account does not have admin access.");
      setLoading(false);
      return;
    }

    await loadCrewData();
    setMessage("");
    setLoading(false);
  }

  async function updateCrewStatus(id: string, status: string, assignedEvent: any) {
    setActionMessage("Updating crew request...");
    const payload: any = { status };
    if (status === "approved") {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    }
    if (assignedEvent?.title) {
      payload.event_title = assignedEvent.title;
    }

    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", id);
    if (error) {
      setActionMessage(`Crew update failed: ${error.message}`);
      return;
    }
    setActionMessage(`Crew request marked ${status}.`);
    await loadCrewData();
  }

  async function deleteCrewAssignment(id: string) {
    const ok = window.confirm("Delete this crew assignment? This cannot be undone.");
    if (!ok) return;

    setActionMessage("Deleting crew assignment...");
    const { error } = await supabase.from("event_crew_assignments").delete().eq("id", id);
    if (error) {
      setActionMessage(`Crew delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Crew assignment deleted.");
    await loadCrewData();
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
    window.location.href = "/login";
  }

  useEffect(() => {
    init();
  }, []);

  const pending = assignments.filter((assignment) => assignment.status !== "approved");
  const approved = assignments.filter((assignment) => assignment.status === "approved");

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <a href="/studio" className="text-pink-300 font-bold">← Back to Studio</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Crew Management</h1>
            <p className="text-slate-300 mt-2">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio crew"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccess && (
          <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl">
            <h2 className="text-2xl font-black">Access Required</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a>
          </div>
        )}

        {!loading && canAccess && (
          <div className="space-y-8">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">All Requests</p><p className="text-3xl font-black">{assignments.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending / Non-approved</p><p className="text-3xl font-black">{pending.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Approved</p><p className="text-3xl font-black">{approved.length}</p></div>
            </div>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Crew Requests</h2>
              <div className="grid gap-4">
                {assignments.map((assignment) => {
                  const assignedEvent = getEventForAssignment(assignment);
                  const displayTitle = assignment.event_title || assignedEvent?.title || "Unknown event";
                  return (
                    <article key={assignment.id} className="border rounded-xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">
                      <ImageThumb src={getImage(assignedEvent)} label={displayTitle} />
                      <div>
                        <h3 className="text-xl font-black">{displayTitle}</h3>
                        {assignedEvent && <p className="text-sm text-gray-600">{formatDate(assignedEvent.date)} · {assignedEvent.location}</p>}
                        <p className="text-sm text-gray-700 mt-2">Crew: {assignment.user_email || assignment.user_id}</p>
                        <p className="text-sm text-gray-500">Type: {assignment.assignment_type || "not specified"}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${statusClass(assignment.status)}`}>{assignment.status || "pending"}</span>
                          {assignment.approved_by && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Approved by {assignment.approved_by}</span>}
                          {!assignedEvent && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Event record not found</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
                        <button onClick={() => updateCrewStatus(assignment.id, "approved", assignedEvent)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                        <button onClick={() => updateCrewStatus(assignment.id, "on_hold", assignedEvent)} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                        <button onClick={() => updateCrewStatus(assignment.id, "rejected", assignedEvent)} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                        <button onClick={() => deleteCrewAssignment(assignment.id)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                      </div>
                    </article>
                  );
                })}
                {assignments.length === 0 && <p className="text-gray-500">No crew requests found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

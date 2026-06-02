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
  return row?.image || row?.image_url || row?.photo || row?.picture || row?.avatar || "";
}

function getName(row: any) {
  return row?.name || row?.title || row?.full_name || row?.member_name || row?.email || "Untitled";
}

function getTitle(row: any) {
  return row?.title || row?.role || row?.position || row?.category || "";
}

function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) {
    return <div className="w-24 h-24 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>;
  }
  return <img src={src} alt={label} className="w-24 h-24 rounded-xl object-cover bg-gray-100 border" />;
}

export default function StudioPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking Studio access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [crewAssignments, setCrewAssignments] = useState<any[]>([]);

  const canAccessStudio = Boolean(user && roleContainsAdmin(role));

  async function loadStudioData() {
    const [eventResult, businessResult, teamResult, crewResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,date,location,status,image,image_urls,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("local_businesses")
        .select("id,name,category,address,status,image,image_urls,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("event_crew_assignments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const errors = [];
    if (eventResult.error) errors.push(`Events: ${eventResult.error.message}`);
    else setEvents(eventResult.data || []);

    if (businessResult.error) errors.push(`Businesses: ${businessResult.error.message}`);
    else setBusinesses(businessResult.data || []);

    if (teamResult.error) errors.push(`Team: ${teamResult.error.message}`);
    else setTeamMembers(teamResult.data || []);

    if (crewResult.error) errors.push(`Crew: ${crewResult.error.message}`);
    else setCrewAssignments(crewResult.data || []);

    if (errors.length) setActionMessage(errors.join(" | "));
  }

  async function init() {
    setLoading(true);
    setMessage("Checking Studio access...");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setEvents([]);
      setBusinesses([]);
      setTeamMembers([]);
      setCrewAssignments([]);
      setMessage("Please login to access Studio.");
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
      setMessage("You are logged in, but this account does not have Studio admin access.");
      setLoading(false);
      return;
    }

    await loadStudioData();
    setMessage("");
    setLoading(false);
  }

  async function updateEventStatus(id: string, status: string) {
    setActionMessage("Updating event...");
    const payload: any = { status };
    if (status === "approved") {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
      payload.approved = true;
    }
    if (status !== "approved") payload.approved = false;

    const { error } = await supabase.from("events").update(payload).eq("id", id);
    if (error) {
      setActionMessage(`Event update failed: ${error.message}`);
      return;
    }
    setActionMessage(`Event marked ${status}.`);
    await loadStudioData();
  }

  async function deleteEvent(id: string, title: string) {
    const ok = window.confirm(`Delete event: ${title}? This cannot be undone.`);
    if (!ok) return;

    setActionMessage("Deleting event...");
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setActionMessage(`Event delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Event deleted.");
    await loadStudioData();
  }

  async function updateBusinessStatus(id: string, status: string) {
    setActionMessage("Updating business...");
    const payload: any = { status };
    if (status === "approved") {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
      payload.approved = true;
    }
    if (status !== "approved") payload.approved = false;

    const { error } = await supabase.from("local_businesses").update(payload).eq("id", id);
    if (error) {
      setActionMessage(`Business update failed: ${error.message}`);
      return;
    }
    setActionMessage(`Business marked ${status}.`);
    await loadStudioData();
  }

  async function deleteBusiness(id: string, name: string) {
    const ok = window.confirm(`Delete business: ${name}? This cannot be undone.`);
    if (!ok) return;

    setActionMessage("Deleting business...");
    const { error } = await supabase.from("local_businesses").delete().eq("id", id);
    if (error) {
      setActionMessage(`Business delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Business deleted.");
    await loadStudioData();
  }

  async function updateCrewStatus(id: string, status: string) {
    setActionMessage("Updating crew request...");
    const payload: any = { status };
    if (status === "approved") {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("event_crew_assignments").update(payload).eq("id", id);
    if (error) {
      setActionMessage(`Crew update failed: ${error.message}`);
      return;
    }
    setActionMessage(`Crew request marked ${status}.`);
    await loadStudioData();
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
    await loadStudioData();
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    window.location.href = "/login";
  }

  useEffect(() => {
    init();
  }, []);

  const pendingEvents = events.filter((item) => item.status !== "approved");
  const pendingBusinesses = businesses.filter((item) => item.status !== "approved");
  const pendingCrew = crewAssignments.filter((item) => item.status !== "approved");

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <a href="/" className="text-pink-300 font-bold">← Back to Seattle Desi TV</a>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Seattle Desi TV Studio</h1>
            <p className="text-slate-300 mt-2">
              {user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Admin dashboard"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccessStudio && (
          <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl">
            <h2 className="text-2xl font-black">Studio Access</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a>
          </div>
        )}

        {!loading && canAccessStudio && (
          <div className="space-y-8">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            <div className="grid md:grid-cols-5 gap-4">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">All Events</p><p className="text-3xl font-black">{events.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending Events</p><p className="text-3xl font-black">{pendingEvents.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Businesses</p><p className="text-3xl font-black">{businesses.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Team</p><p className="text-3xl font-black">{teamMembers.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Crew Requests</p><p className="text-3xl font-black">{pendingCrew.length}</p></div>
            </div>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Events</h2>
              <div className="grid gap-3">
                {events.map((event) => (
                  <div key={event.id} className="border rounded-xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">
                    <ImageThumb src={getImage(event)} label={event.title} />
                    <div>
                      <h3 className="font-black">{event.title}</h3>
                      <p className="text-sm text-gray-600">{formatDate(event.date)} · {event.location}</p>
                      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full mt-3 ${statusClass(event.status)}`}>{event.status || "pending"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
                      <button onClick={() => updateEventStatus(event.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button onClick={() => updateEventStatus(event.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button onClick={() => updateEventStatus(event.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button onClick={() => deleteEvent(event.id, event.title)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Businesses</h2>
              <div className="grid gap-3">
                {businesses.map((business) => (
                  <div key={business.id} className="border rounded-xl p-4 grid md:grid-cols-[96px_1fr_auto] gap-4 items-center">
                    <ImageThumb src={getImage(business)} label={business.name} />
                    <div>
                      <h3 className="font-black">{business.name}</h3>
                      <p className="text-sm text-gray-600">{business.category} · {business.address}</p>
                      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full mt-3 ${statusClass(business.status)}`}>{business.status || "pending"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
                      <button onClick={() => updateBusinessStatus(business.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button onClick={() => updateBusinessStatus(business.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button onClick={() => updateBusinessStatus(business.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button onClick={() => deleteBusiness(business.id, business.name)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Team Members</h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div key={member.id || getName(member)} className="border rounded-xl p-4 flex gap-4 items-center">
                    <ImageThumb src={getImage(member)} label={getName(member)} />
                    <div>
                      <h3 className="font-black">{getName(member)}</h3>
                      <p className="text-sm text-gray-600">{getTitle(member)}</p>
                      {member.email && <p className="text-xs text-gray-500 mt-1">{member.email}</p>}
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && <p className="text-gray-500">No team members found.</p>}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">Crew Requests</h2>
              <div className="grid gap-3">
                {crewAssignments.map((assignment) => (
                  <div key={assignment.id} className="border rounded-xl p-4 grid md:grid-cols-[1fr_auto] gap-4">
                    <div>
                      <h3 className="font-black">{assignment.event_title || assignment.event_id}</h3>
                      <p className="text-sm text-gray-600">{assignment.user_email} · {assignment.assignment_type}</p>
                      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full mt-3 ${statusClass(assignment.status)}`}>{assignment.status || "pending"}</span>
                      {assignment.approved_by && <p className="text-xs text-gray-500 mt-2">Approved by {assignment.approved_by}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
                      <button onClick={() => updateCrewStatus(assignment.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button onClick={() => updateCrewStatus(assignment.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button onClick={() => updateCrewStatus(assignment.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button onClick={() => deleteCrewAssignment(assignment.id)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                    </div>
                  </div>
                ))}
                {crewAssignments.length === 0 && <p className="text-gray-500">No crew requests found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

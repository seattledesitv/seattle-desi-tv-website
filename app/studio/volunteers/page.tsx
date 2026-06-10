"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

function label(value?: string | null) {
  if (value === "awaiting_orientation") return "Awaiting Orientation";
  if (value === "awaiting_onboarding") return "Complete Onboarding";
  if (value === "awaiting_team_role_access") return "Awaiting Team Role Access";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return value || "Pending";
}

export default function StudioVolunteersPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const canAccess = Boolean(user && isAdminRole(role));

  const submissionByRequestId = useMemo(() => {
    const map: Record<string, any> = {};
    submissions.forEach((item: any) => { if (item.volunteer_request_id) map[item.volunteer_request_id] = item; });
    return map;
  }, [submissions]);

  async function loadVolunteers() {
    const requestResult = await supabase.from("user_role_requests").select("id,user_id,email,requested_role,status,approved_role,approved_by,approved_at,created_at").eq("requested_role", "volunteer").order("created_at", { ascending: false });
    if (requestResult.error) { setActionMessage(`Could not load volunteer requests: ${requestResult.error.message}`); return; }
    const submissionResult = await supabase.from("volunteer_onboarding_submissions").select("id,user_id,email,volunteer_request_id,full_name,phone,city,interests,availability,experience,photo_url,agreement_acknowledged,agreement_acknowledged_at,status,created_at").order("created_at", { ascending: false });
    if (submissionResult.error) setActionMessage(`Volunteer requests loaded, but onboarding submissions could not load: ${submissionResult.error.message}`);
    setRequests(requestResult.data || []);
    setSubmissions(submissionResult.data || []);
  }

  async function init() {
    setLoading(true); setMessage("Checking access..."); setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access volunteer management."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This account does not have volunteer management access."); setLoading(false); return; }
    await loadVolunteers(); setMessage(""); setLoading(false);
  }

  async function updateStatus(request: any, status: string) {
    setActionMessage(`Updating ${request.email} to ${label(status)}...`);
    const patch: any = { status };
    if (status === "approved" || status === "rejected") { patch.approved_by = user?.email || user?.id || null; patch.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("user_role_requests").update(patch).eq("id", request.id);
    if (error) { setActionMessage(`Status update failed: ${error.message}`); return; }
    setActionMessage(`Updated ${request.email} to ${label(status)}.`);
    await loadVolunteers();
  }

  async function approveTeamAccess(request: any) {
    setActionMessage(`Approving team access for ${request.email}...`);
    const upsertResult = await supabase.from("admins").upsert({ user_id: request.user_id, email: request.email, role: "team_member" }, { onConflict: "email" });
    if (upsertResult.error) { setActionMessage(`Could not assign team member role: ${upsertResult.error.message}`); return; }
    const updateResult = await supabase.from("user_role_requests").update({ status: "approved", approved_role: "team_member", approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }).eq("id", request.id);
    if (updateResult.error) { setActionMessage(`Role assigned, but request update failed: ${updateResult.error.message}`); return; }
    setActionMessage(`Approved ${request.email} as team_member.`);
    await loadVolunteers();
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Volunteer Requests</h1><p className="text-slate-300 mt-2">Complete orientation, review onboarding, and approve team access.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="grid md:grid-cols-4 gap-4">{["awaiting_orientation", "awaiting_onboarding", "awaiting_team_role_access", "approved"].map((status) => <div key={status} className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300 text-sm font-bold uppercase">{label(status)}</p><p className="text-4xl font-black">{requests.filter((request) => request.status === status).length}</p></div>)}</div><div className="grid gap-4">{requests.map((request) => { const onboarding = submissionByRequestId[request.id]; return <article key={request.id} className="bg-white text-slate-950 rounded-2xl p-5 grid xl:grid-cols-[1fr_auto] gap-4"><div><div className="flex gap-4 items-start"><div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden grid place-items-center shrink-0">{onboarding?.photo_url ? <img src={onboarding.photo_url} alt={onboarding.full_name || request.email} className="w-full h-full object-cover" /> : <span className="font-black text-pink-600">SDTV</span>}</div><div><h2 className="text-xl font-black">{onboarding?.full_name || request.email}</h2><p className="text-sm text-gray-600">{request.email}</p><p className="text-sm text-gray-600 mt-1">Status: <b>{label(request.status)}</b></p>{onboarding && <p className="text-sm text-green-700 font-bold mt-1">Onboarding submitted · Agreement: {onboarding.agreement_acknowledged ? "Yes" : "No"}</p>}</div></div>{onboarding && <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm"><p><b>Phone:</b> {onboarding.phone || "—"}</p><p><b>City:</b> {onboarding.city || "—"}</p><p><b>Interests:</b> {onboarding.interests || "—"}</p><p><b>Availability:</b> {onboarding.availability || "—"}</p></div>}</div><div className="flex flex-wrap xl:flex-col gap-2 xl:min-w-56"><button onClick={() => updateStatus(request, "awaiting_onboarding")} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Complete Orientation</button><button onClick={() => setSelected({ request, onboarding })} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm">Review Onboarding</button><button onClick={() => approveTeamAccess(request)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Approve Team Access</button><button onClick={() => updateStatus(request, "rejected")} className="border border-red-600 text-red-700 px-4 py-2 rounded-xl font-bold text-sm">Reject</button></div></article>; })}{requests.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No volunteer requests found.</div>}</div></div>}{selected && <div className="fixed inset-0 bg-black/70 z-50 p-4 overflow-y-auto"><div className="bg-white text-slate-950 rounded-3xl max-w-3xl mx-auto p-6 md:p-8"><div className="flex justify-between gap-4"><div><h2 className="text-3xl font-black">Onboarding Review</h2><p className="text-gray-600">{selected.request.email}</p></div><button onClick={() => setSelected(null)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold h-fit">Close</button></div>{!selected.onboarding && <div className="bg-yellow-50 text-yellow-900 rounded-2xl p-5 mt-5 font-bold">No onboarding submission found yet.</div>}{selected.onboarding && <div className="grid gap-4 mt-5"><div className="flex gap-4 items-center">{selected.onboarding.photo_url && <img src={selected.onboarding.photo_url} alt={selected.onboarding.full_name} className="w-24 h-24 rounded-2xl object-cover" />}<div><h3 className="text-2xl font-black">{selected.onboarding.full_name}</h3><p>{selected.onboarding.phone}</p><p>{selected.onboarding.city}</p></div></div><div className="grid md:grid-cols-2 gap-4 text-sm"><div className="bg-slate-50 rounded-2xl p-4"><b>Interests</b><p className="mt-1 whitespace-pre-line">{selected.onboarding.interests || "—"}</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>Availability</b><p className="mt-1 whitespace-pre-line">{selected.onboarding.availability || "—"}</p></div><div className="bg-slate-50 rounded-2xl p-4"><b>Experience</b><p className="mt-1 whitespace-pre-line">{selected.onboarding.experience || "—"}</p></div><div className="bg-green-50 text-green-800 rounded-2xl p-4 font-bold">Agreement acknowledged: {selected.onboarding.agreement_acknowledged ? "Yes" : "No"}</div></div><div className="flex flex-wrap gap-3"><button onClick={() => { approveTeamAccess(selected.request); setSelected(null); }} className="bg-green-600 text-white px-5 py-3 rounded-xl font-black">Approve Team Access</button><button onClick={() => { updateStatus(selected.request, "rejected"); setSelected(null); }} className="border border-red-600 text-red-700 px-5 py-3 rounded-xl font-black">Reject</button></div></div>}</div></div>}</div></main>;
}

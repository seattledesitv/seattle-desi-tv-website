"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const ROLES = ["general_public", "team_member", "video_editor", "pm_admin", "super_admin"];
const STATUS_OPTIONS = ["all", "pending", "approved", "rejected"];
const supabase = getSupabaseBrowserClient();
function norm(value?: string | null) { return String(value || "").trim().toLowerCase(); }

export default function StudioRolesPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [requestedRoleFilter, setRequestedRoleFilter] = useState("all");
  const [approvedRoleFilter, setApprovedRoleFilter] = useState("all");
  const canAccess = Boolean(user && isAdminRole(role));

  const filteredRequests = useMemo(() => {
    const query = norm(searchText);
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (requestedRoleFilter !== "all" && request.requested_role !== requestedRoleFilter) return false;
      if (approvedRoleFilter !== "all" && (request.approved_role || "") !== approvedRoleFilter) return false;
      if (!query) return true;
      return norm(`${request.email || ""} ${request.requested_role || ""} ${request.status || ""} ${request.approved_role || ""} ${request.approved_by || ""}`).includes(query);
    });
  }, [requests, searchText, statusFilter, requestedRoleFilter, approvedRoleFilter]);

  async function notifyUser(userId: string, title: string, message: string, link: string) {
    if (!userId) return;
    await supabase.from("notifications").insert({ user_id: userId, title, message, link, read: false });
  }

  async function loadRequests() {
    const { data, error } = await supabase.from("user_role_requests").select("id,user_id,email,requested_role,status,approved_role,approved_by,approved_at,created_at").order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load role requests: ${error.message}`); return; }
    setRequests(data || []);
    const next: Record<string, string> = {};
    (data || []).forEach((item: any) => { next[item.id] = item.approved_role || item.requested_role || "general_public"; });
    setSelectedRoles(next);
  }

  async function init() {
    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access role requests."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This account does not have role approval access."); setLoading(false); return; }
    await loadRequests(); setMessage(""); setLoading(false);
  }

  async function approveRequest(request: any) {
    const approvedRole = selectedRoles[request.id] || request.requested_role || "general_public";
    setActionMessage("Approving role request...");

    if (isAdminRole(approvedRole)) {
      const { error: upsertError } = await supabase.from("admins").upsert({ user_id: request.user_id, email: request.email, role: approvedRole }, { onConflict: "email" });
      if (upsertError) { setActionMessage(`Could not update admin role: ${upsertError.message}`); return; }
    }

    const { error: updateError } = await supabase.from("user_role_requests").update({ status: "approved", approved_role: approvedRole, approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }).eq("id", request.id);
    if (updateError) { setActionMessage(`Could not approve role request: ${updateError.message}`); return; }
    await notifyUser(request.user_id, "Role request approved", `Your Seattle Desi TV role request was approved as ${approvedRole}.`, "/portal");
    setActionMessage(`Approved ${request.email} as ${approvedRole}.`);
    await loadRequests();
  }

  async function rejectRequest(request: any) {
    setActionMessage("Rejecting role request...");
    const { error } = await supabase.from("user_role_requests").update({ status: "rejected", approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }).eq("id", request.id);
    if (error) { setActionMessage(`Reject failed: ${error.message}`); return; }
    await notifyUser(request.user_id, "Role request rejected", "Your Seattle Desi TV role request was reviewed and rejected.", "/portal");
    setActionMessage(`Rejected request from ${request.email}.`);
    await loadRequests();
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-6xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Role Requests</h1><p className="text-slate-300 mt-2">Approve public users, SDTV team members, video editors, and admins.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300">Total Role Requests</p><p className="text-4xl font-black">{requests.length}</p><p className="mt-2 text-sm text-slate-300">Showing {filteredRequests.length} after filters</p></div><div className="rounded-2xl bg-white p-5 text-slate-950"><h2 className="text-xl font-black">Filters</h2><div className="mt-4 grid gap-3 md:grid-cols-4"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search email, role, reviewer..." className="rounded-xl border p-3 font-bold md:col-span-2" /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All statuses</option>{STATUS_OPTIONS.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}</select><select value={requestedRoleFilter} onChange={(event) => setRequestedRoleFilter(event.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All requested roles</option>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select><select value={approvedRoleFilter} onChange={(event) => setApprovedRoleFilter(event.target.value)} className="rounded-xl border p-3 font-bold md:col-span-2"><option value="all">All approved roles</option>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select><button onClick={() => { setSearchText(""); setStatusFilter("all"); setRequestedRoleFilter("all"); setApprovedRoleFilter("all"); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700 md:col-span-2">Clear Filters</button></div></div><div className="grid gap-4">{filteredRequests.map((request) => <article key={request.id} className="bg-white text-slate-950 rounded-2xl p-5 grid lg:grid-cols-[1fr_auto] gap-4 items-center"><div><h2 className="text-xl font-black">{request.email}</h2><p className="text-sm text-gray-600 mt-1">Requested: <b>{request.requested_role}</b> · Status: <b>{request.status}</b></p>{request.approved_role && <p className="text-sm text-gray-600">Approved role: <b>{request.approved_role}</b></p>}{request.approved_by && <p className="text-xs text-gray-500 mt-1">Reviewed by {request.approved_by}</p>}</div><div className="flex flex-wrap gap-2 lg:justify-end"><select className="border rounded-lg p-2 text-sm" value={selectedRoles[request.id] || request.requested_role || "general_public"} onChange={(event) => setSelectedRoles({ ...selectedRoles, [request.id]: event.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select><button onClick={() => approveRequest(request)} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button><button onClick={() => rejectRequest(request)} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button></div></article>)}{filteredRequests.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No role requests match the current filters.</div>}</div></div>}</div></main>;
}

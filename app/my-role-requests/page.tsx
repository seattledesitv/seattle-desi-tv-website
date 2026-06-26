"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type RoleRequest = {
  id: string;
  requested_role?: string | null;
  status?: string | null;
  approved_role?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function titleCase(value?: string | null) {
  return String(value || "")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusLabel(status?: string | null) {
  if (status === "awaiting_orientation") return "Awaiting Orientation";
  if (status === "awaiting_onboarding") return "Complete Your Onboarding";
  if (status === "awaiting_team_role_access") return "Awaiting Team Role Access";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  if (status === "rejected") return "Not Approved";
  if (status === "changes_requested") return "Changes Requested";
  return titleCase(status || "pending") || "Pending";
}

function statusNote(row: RoleRequest) {
  const role = titleCase(row.requested_role || "role").toLowerCase();
  if (row.status === "awaiting_orientation") return "Thank you for your interest. The SDTV team will contact you for orientation.";
  if (row.status === "awaiting_onboarding") return "Your orientation is complete. Please complete onboarding so the team can review your details and agreements.";
  if (row.status === "awaiting_team_role_access") return "Your onboarding has been submitted and is awaiting team role access approval.";
  if (row.status === "approved") return `Your ${role} request has been approved.`;
  if (row.status === "pending") return "Your request has been submitted and is awaiting admin approval.";
  if (row.status === "rejected") return "This request was not approved. Please contact the SDTV team if you need help.";
  if (row.status === "changes_requested") return "The SDTV team needs an update before this request can be approved.";
  return "Track the latest status for this SDTV access request.";
}

function statusClass(status?: string | null) {
  if (status === "approved") return "bg-green-50 text-green-700 border-green-200";
  if (status === "rejected") return "bg-red-50 text-red-700 border-red-200";
  if (status === "awaiting_onboarding") return "bg-pink-50 text-pink-700 border-pink-200";
  if (status === "awaiting_orientation" || status === "awaiting_team_role_access" || status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function MyRoleRequestsPage() {
  const [rows, setRows] = useState<RoleRequest[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [loading, setLoading] = useState(true);

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    const email = user?.email || "";

    if (!user?.id && !email) {
      setRows([]);
      setMessage("Please login to view your role requests.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_role_requests")
      .select("id,requested_role,status,approved_role,created_at,updated_at")
      .or(`user_id.eq.${user?.id},email.eq.${email}`)
      .order("created_at", { ascending: false });

    setRows(data || []);
    setMessage(error ? error.message : "Role requests submitted from your SDTV profile.");
    setLoading(false);
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
          <h1 className="text-4xl md:text-5xl font-black mt-2">SDTV Journey</h1>
          <p className="text-slate-300 mt-2">{message}</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a href="/my-hub" className="bg-white text-slate-950 px-5 py-3 rounded-xl font-black">Back to My Hub</a>
            <a href="/portal" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Open Settings</a>
            <button type="button" onClick={loadRows} className="border border-white/30 text-white px-5 py-3 rounded-xl font-black">Refresh</button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white text-slate-950 rounded-3xl p-8">Loading role requests...</div>
        ) : rows.length === 0 ? (
          <div className="bg-white text-slate-950 rounded-3xl p-8">
            <h2 className="text-2xl font-black">No role requests found</h2>
            <p className="text-gray-600 mt-2">Use Settings to request volunteer or team access.</p>
            <a href="/portal" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-black mt-5">Open Settings</a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rows.map((row) => (
              <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 shadow-xl border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-black uppercase tracking-wide">Requested Role</p>
                    <h2 className="text-2xl font-black mt-1">{titleCase(row.requested_role || "Role Request")}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black border whitespace-nowrap ${statusClass(row.status)}`}>{statusLabel(row.status)}</span>
                </div>
                <p className="text-gray-700 mt-4">{statusNote(row)}</p>
                {row.approved_role && <p className="text-sm text-green-700 font-bold mt-3">Approved role: {titleCase(row.approved_role)}</p>}
                <div className="text-sm text-gray-500 mt-5 space-y-1">
                  {row.created_at && <p>Submitted: {formatDate(row.created_at)}</p>}
                  {row.updated_at && <p>Last updated: {formatDate(row.updated_at)}</p>}
                </div>
                {row.status === "awaiting_onboarding" && <a href="/onboarding" className="block bg-pink-600 text-white text-center px-5 py-3 rounded-xl font-black mt-5">Complete Onboarding</a>}
                {row.status === "approved" && <a href="/my-hub" className="block bg-slate-900 text-white text-center px-5 py-3 rounded-xl font-black mt-5">Open My Hub</a>}
              </article>
            ))}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

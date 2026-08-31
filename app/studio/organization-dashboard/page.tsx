"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type FilterKey = "all" | "claimed" | "unclaimed" | "pending" | "missing_image" | "missing_website" | "missing_contact";

function text(value?: string | null) {
  return String(value || "").toLowerCase();
}

function StatusCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`rounded-3xl border p-5 text-left transition ${active ? "border-pink-500 bg-pink-50" : "border-slate-200 bg-white hover:border-pink-200"}`}>
    <p className="text-3xl font-black text-slate-950">{value}</p>
    <p className="mt-1 text-sm font-black text-slate-500">{label}</p>
  </button>;
}

export default function OrganizationDashboardPage() {
  const site = useCurrentSite();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [pendingClaims, setPendingClaims] = useState(0);
  const [pendingSuggestions, setPendingSuggestions] = useState(0);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user) { setMessage("Please login to access Studio."); setLoading(false); return; }
    const role = await resolveUserRole(supabase, user);
    if (!isAdminRole(role)) { setMessage("Admin access required."); setLoading(false); return; }

    const organizationResult = await forSite(supabase.from("community_organizations").select("*"), site.id).order("created_at", { ascending: false }).limit(2000);
    if (organizationResult.error) { setMessage(`Could not load organizations: ${organizationResult.error.message}`); setLoading(false); return; }
    setOrganizations(organizationResult.data || []);

    const managerResult = await forSite(supabase.from("organization_managers").select("organization_id"), site.id).eq("active", true);
    if (!managerResult.error) setClaimedIds(new Set((managerResult.data || []).map((row: any) => String(row.organization_id))));

    const claimResult = await forSite(supabase.from("organization_claim_requests").select("id", { count: "exact", head: true }), site.id).eq("status", "pending");
    if (!claimResult.error) setPendingClaims(claimResult.count || 0);

    const suggestionResult = await forSite(supabase.from("organization_edit_suggestions").select("id", { count: "exact", head: true }), site.id).eq("status", "pending");
    if (!suggestionResult.error) setPendingSuggestions(suggestionResult.count || 0);

    setMessage("");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const counts = useMemo(() => ({
    total: organizations.length,
    claimed: organizations.filter((row) => claimedIds.has(String(row.id))).length,
    unclaimed: organizations.filter((row) => !claimedIds.has(String(row.id))).length,
    pending: organizations.filter((row) => !row.status || row.status === "pending").length,
    missingImage: organizations.filter((row) => !row.image).length,
    missingWebsite: organizations.filter((row) => !row.website).length,
    missingContact: organizations.filter((row) => !row.contact_email && !row.contact_phone).length,
  }), [organizations, claimedIds]);

  const filtered = useMemo(() => {
    const query = text(search);
    return organizations.filter((row) => {
      if (filter === "claimed" && !claimedIds.has(String(row.id))) return false;
      if (filter === "unclaimed" && claimedIds.has(String(row.id))) return false;
      if (filter === "pending" && row.status && row.status !== "pending") return false;
      if (filter === "missing_image" && row.image) return false;
      if (filter === "missing_website" && row.website) return false;
      if (filter === "missing_contact" && (row.contact_email || row.contact_phone)) return false;
      if (!query) return true;
      return text(`${row.name} ${row.category} ${row.organization_type} ${row.location} ${row.website} ${row.contact_email}`).includes(query);
    });
  }, [organizations, claimedIds, filter, search]);

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><a href="/studio" className="font-black text-pink-300">← Back to Studio</a><p className="mt-4 font-black uppercase tracking-wide text-pink-300">Directory Operations</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Organization Dashboard</h1><p className="mt-2 text-slate-300">See profile quality, manager coverage, claims, suggestions, and records needing attention.</p></div>
        <div className="flex flex-wrap gap-3"><a href="/studio/community-orgs" className="rounded-xl bg-pink-600 px-5 py-3 font-black">Manage Organizations</a><button onClick={load} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>
      </div>

      {loading ? <div className="mt-8 rounded-3xl bg-white/10 p-6">{message}</div> : message ? <div className="mt-8 rounded-3xl bg-white p-6 font-bold text-slate-950">{message}</div> : <>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard label="Total Organizations" value={counts.total} active={filter === "all"} onClick={() => setFilter("all")} />
          <StatusCard label="Claimed" value={counts.claimed} active={filter === "claimed"} onClick={() => setFilter("claimed")} />
          <StatusCard label="Unclaimed" value={counts.unclaimed} active={filter === "unclaimed"} onClick={() => setFilter("unclaimed")} />
          <StatusCard label="Pending Listings" value={counts.pending} active={filter === "pending"} onClick={() => setFilter("pending")} />
          <StatusCard label="Pending Claims" value={pendingClaims} active={false} onClick={() => { window.location.href = "/studio/organization-claims"; }} />
          <StatusCard label="Pending Suggestions" value={pendingSuggestions} active={false} onClick={() => { window.location.href = "/studio/organization-suggestions"; }} />
          <StatusCard label="Missing Image" value={counts.missingImage} active={filter === "missing_image"} onClick={() => setFilter("missing_image")} />
          <StatusCard label="Missing Website" value={counts.missingWebsite} active={filter === "missing_website"} onClick={() => setFilter("missing_website")} />
          <StatusCard label="Missing Contact" value={counts.missingContact} active={filter === "missing_contact"} onClick={() => setFilter("missing_contact")} />
        </section>

        <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Current view</p><h2 className="text-2xl font-black">{filtered.length} organizations</h2></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations..." className="w-full rounded-xl border p-3 font-bold md:max-w-sm" /></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Organization</th><th className="p-3">Status</th><th className="p-3">Manager</th><th className="p-3">Image</th><th className="p-3">Website</th><th className="p-3">Contact</th><th className="p-3">Actions</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="p-3"><p className="font-black">{row.name}</p><p className="text-xs text-slate-500">{row.category || row.organization_type || "Organization"} · {row.location || "Seattle Area"}</p></td><td className="p-3 font-bold">{String(row.status || "pending").replaceAll("_", " ")}</td><td className="p-3">{claimedIds.has(String(row.id)) ? <span className="font-black text-emerald-700">Claimed</span> : <span className="font-bold text-slate-500">Unclaimed</span>}</td><td className="p-3">{row.image ? "✓" : "Missing"}</td><td className="p-3">{row.website ? "✓" : "Missing"}</td><td className="p-3">{row.contact_email || row.contact_phone ? "✓" : "Missing"}</td><td className="p-3"><div className="flex gap-2"><a href={`/studio/community-orgs?organization=${row.id}`} className="rounded-lg bg-slate-950 px-3 py-2 font-black text-white">Manage</a><a href={`/community-organizations/${row.id}`} className="rounded-lg border px-3 py-2 font-black">Public</a></div></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="py-8 text-center font-bold text-slate-500">No organizations match this view.</p>}</div>
        </section>
      </>}
    </section>
  </main>;
}

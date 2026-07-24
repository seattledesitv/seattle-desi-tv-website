"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type Candidate = { url: string; source: string };

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().trim().includes("admin"); }
function statusClass(status?: string | null) {
  const value = String(status || "pending").toLowerCase();
  if (value === "approved") return "bg-green-100 text-green-800";
  if (value === "rejected") return "bg-red-100 text-red-800";
  if (value === "on_hold") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}
function getImage(row: any) { return Array.isArray(row?.image_urls) && row.image_urls.length ? row.image_urls[0] : row?.image || ""; }
function normalizeWebsite(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) return <div className="grid h-28 w-28 place-items-center rounded-xl bg-pink-50 px-2 text-center text-xs font-black text-pink-600">No image</div>;
  return <img src={src} alt={label} className="h-28 w-28 rounded-xl border bg-gray-100 object-cover" />;
}

export default function StudioBusinessesPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [websiteDrafts, setWebsiteDrafts] = useState<Record<string, string>>({});
  const [savingWebsite, setSavingWebsite] = useState("");
  const [discovering, setDiscovering] = useState("");
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const canAccess = Boolean(user && roleContainsAdmin(role));

  async function loadBusinesses() {
    const { data, error } = await supabase.from("local_businesses")
      .select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,image,image_urls,status,approved,created_at,source_name,source_url,import_batch,imported_at,review_notes")
      .order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load businesses: ${error.message}`); return; }
    setBusinesses(data || []);
    setWebsiteDrafts((current) => {
      const next = { ...current };
      (data || []).forEach((row: any) => { if (next[row.id] === undefined) next[row.id] = row.website || ""; });
      return next;
    });
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setBusinesses([]); setMessage("Please login to access Studio Businesses."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await loadBusinesses(); setMessage(""); setLoading(false);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSearch = params.get("search");
    if (requestedSearch) { setSearch(requestedSearch); setStatusFilter("all"); }
    init();
  }, []);

  async function saveWebsite(business: any) {
    const website = normalizeWebsite(websiteDrafts[business.id] || "");
    if (!website) { setActionMessage(`Enter an official website for ${business.name}.`); return; }
    try { new URL(website); } catch { setActionMessage("Enter a valid website address."); return; }
    setSavingWebsite(business.id); setActionMessage(`Saving website for ${business.name}...`);
    const note = `${business.review_notes ? `${business.review_notes}\n` : ""}Official website reviewed and saved on ${new Date().toISOString()}`;
    const { error } = await supabase.from("local_businesses").update({ website, review_notes: note }).eq("id", business.id);
    setSavingWebsite("");
    if (error) { setActionMessage(`Could not save website: ${error.message}`); return; }
    setActionMessage(`Official website saved for ${business.name}. You can now find official images.`);
    await loadBusinesses();
  }

  async function discoverImages(business: any) {
    if (!business.website) { setActionMessage(`Save an official website for ${business.name} first.`); return; }
    setDiscovering(business.id); setActionMessage(`Checking ${business.name}'s official website...`);
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || "";
    const response = await fetch("/api/studio/business-image-candidates", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ website: business.website }) });
    const result = await response.json();
    setDiscovering("");
    if (!response.ok) { setActionMessage(result.error || "Could not discover images."); return; }
    setCandidates((current) => ({ ...current, [business.id]: result.candidates || [] }));
    setActionMessage(result.candidates?.length ? `Found ${result.candidates.length} candidate image(s) for ${business.name}. Review them below.` : `No suitable official-site images were found for ${business.name}.`);
  }

  async function applyImage(business: any, candidate: Candidate) {
    if (!window.confirm(`Use this ${candidate.source} for ${business.name}? Confirm that it is appropriate for the SDTV directory.`)) return;
    setActionMessage("Saving approved image...");
    const urls = Array.from(new Set([candidate.url, ...(business.image_urls || [])]));
    const note = `${business.review_notes ? `${business.review_notes}\n` : ""}Image approved from ${business.website} (${candidate.source}) on ${new Date().toISOString()}`;
    const { error } = await supabase.from("local_businesses").update({ image: candidate.url, image_urls: urls, review_notes: note }).eq("id", business.id);
    if (error) { setActionMessage(`Could not save image: ${error.message}`); return; }
    setCandidates((current) => ({ ...current, [business.id]: [] }));
    setActionMessage(`Approved image saved for ${business.name}.`);
    await loadBusinesses();
  }

  async function updateBusinessStatus(id: string, status: string) {
    setActionMessage("Updating business...");
    const payload: any = { status, approved: status === "approved" };
    if (status === "approved") { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("local_businesses").update(payload).eq("id", id);
    if (error) { setActionMessage(`Business update failed: ${error.message}`); return; }
    setActionMessage(`Business marked ${status}.`); await loadBusinesses();
  }

  async function deleteBusiness(id: string, name: string) {
    if (!window.confirm(`Delete business: ${name}? This cannot be undone.`)) return;
    setActionMessage("Deleting business...");
    const { error } = await supabase.from("local_businesses").delete().eq("id", id);
    if (error) { setActionMessage(`Business delete failed: ${error.message}`); return; }
    setActionMessage("Business deleted."); await loadBusinesses();
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try { Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key)); } catch {}
    window.location.href = "/login";
  }

  const pending = businesses.filter((b) => b.status !== "approved");
  const approved = businesses.filter((b) => b.status === "approved");
  const missingWebsite = businesses.filter((b) => !b.website).length;
  const missingImage = businesses.filter((b) => !getImage(b)).length;
  const sources = Array.from(new Set(businesses.map((b) => b.source_name).filter(Boolean))).sort();
  const visibleBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const normalizedStatus = String(business.status || "pending");
      const statusMatches = statusFilter === "all" || (statusFilter === "pending" ? normalizedStatus === "pending" : normalizedStatus === statusFilter);
      const sourceMatches = sourceFilter === "all" || (sourceFilter === "imported" ? Boolean(business.import_batch) : business.source_name === sourceFilter);
      const textMatches = !query || [business.name, business.address, business.category, business.source_name, business.import_batch].some((value) => String(value || "").toLowerCase().includes(query));
      return statusMatches && sourceMatches && textMatches;
    });
  }, [businesses, search, statusFilter, sourceFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-4xl font-black md:text-5xl">Businesses Management</h1><p className="mt-2 text-slate-300">Research, enrich, review, and approve each business from one unified workspace.</p><p className="mt-1 text-sm text-slate-400">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio businesses"}</p></div><div className="flex flex-wrap gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button>{user&&<button onClick={logout} className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300">Logout</button>}</div></div>
    {loading&&<div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}
    {!loading&&!canAccess&&<div className="max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div>}
    {!loading&&canAccess&&<div className="space-y-8">{actionMessage&&<div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
      <div className="grid gap-4 md:grid-cols-4"><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-slate-300">All Businesses</p><p className="text-3xl font-black">{businesses.length}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-slate-300">Pending</p><p className="text-3xl font-black">{pending.length}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-slate-300">Missing Website</p><p className="text-3xl font-black">{missingWebsite}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-5"><p className="text-slate-300">Missing Image</p><p className="text-3xl font-black">{missingImage}</p></div></div>
      <section className="rounded-2xl bg-white p-6 text-slate-950"><div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-2xl font-black">Unified Business Review Queue</h2><p className="mt-1 text-sm text-gray-500">Find the website, save it, discover official images, and approve the listing without leaving this page.</p></div><div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name, city, category..." className="min-w-64 rounded-lg border px-3 py-2"/><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option></select><select value={sourceFilter} onChange={(e)=>setSourceFilter(e.target.value)} className="rounded-lg border px-3 py-2"><option value="all">All sources</option><option value="imported">All imported</option>{sources.map((source:any)=><option key={source} value={source}>{source}</option>)}</select></div></div>
        <p className="mb-4 text-sm text-gray-500">Showing {visibleBusinesses.length} of {businesses.length} businesses. {approved.length} approved.</p>
        <div className="grid gap-5">{visibleBusinesses.map((business)=>{const found=candidates[business.id]||[];const websiteSearch=`https://www.google.com/search?q=${encodeURIComponent(`official website ${business.name} ${business.address||"Seattle Washington"}`)}`;return <article key={business.id} className="rounded-2xl border p-4"><div className="grid items-start gap-4 md:grid-cols-[112px_1fr] lg:grid-cols-[112px_1fr_auto]"><ImageThumb src={getImage(business)} label={business.name}/><div><h3 className="text-xl font-black">{business.name}</h3><p className="text-sm text-gray-600">{business.category||"Uncategorized"} · {business.address||"No address"}</p><div className="mt-2 flex flex-wrap gap-4">{business.website&&<CheckedExternalLink href={business.website} notFoundMessage="Page not found. This business website is not available." className="text-sm font-bold text-pink-600 disabled:opacity-60">Business website</CheckedExternalLink>}{business.source_url&&<a href={business.source_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-700">Review source</a>}</div>{business.review_notes&&<p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">{business.review_notes}</p>}<div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-sm font-bold ${statusClass(business.status)}`}>{business.status||"pending"}</span>{business.source_name&&<span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">Source: {business.source_name}</span>}{business.import_batch&&<span className="rounded bg-purple-50 px-2 py-1 text-xs text-purple-800">Batch: {business.import_batch}</span>}</div></div>
          <div className="flex max-w-md flex-wrap gap-2 lg:justify-end">{!business.website&&<a href={websiteSearch} target="_blank" rel="noreferrer" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">Find website</a>}{business.website&&<button disabled={discovering===business.id} onClick={()=>discoverImages(business)} className="rounded-lg bg-pink-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{discovering===business.id?"Checking...":"Find official images"}</button>}<a href={`/studio/businesses/${business.id}`} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white">Full Edit</a><button onClick={()=>updateBusinessStatus(business.id,"approved")} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white">Approve</button><button onClick={()=>updateBusinessStatus(business.id,"on_hold")} className="rounded-lg bg-yellow-500 px-3 py-2 text-sm font-bold text-white">On Hold</button><button onClick={()=>updateBusinessStatus(business.id,"rejected")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white">Reject</button><button onClick={()=>deleteBusiness(business.id,business.name)} className="rounded-lg border border-red-600 px-3 py-2 text-sm font-bold text-red-600">Delete</button></div></div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-black">Official website</p><div className="flex flex-col gap-2 sm:flex-row"><input value={websiteDrafts[business.id]??business.website??""} onChange={(e)=>setWebsiteDrafts((current)=>({...current,[business.id]:e.target.value}))} placeholder="https://official-business-website.com" className="flex-1 rounded-lg border bg-white px-3 py-2"/><button disabled={savingWebsite===business.id} onClick={()=>saveWebsite(business)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{savingWebsite===business.id?"Saving...":"Save website"}</button></div><p className="mt-2 text-xs text-gray-500">Verify that the business name and address match before saving.</p></div>
          {found.length>0&&<div className="mt-5 border-t pt-5"><div className="mb-3 flex items-center justify-between"><p className="font-black">Official-site image candidates</p><button onClick={()=>setCandidates((current)=>({...current,[business.id]:[]}))} className="text-sm font-bold text-gray-500">Clear</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{found.map((candidate)=><div key={candidate.url} className="rounded-xl border p-3"><img src={candidate.url} alt={`${business.name} candidate`} className="h-40 w-full rounded-lg bg-gray-50 object-contain"/><p className="mt-2 text-xs text-gray-500">{candidate.source}</p><button onClick={()=>applyImage(business,candidate)} className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-black text-white">Approve & use</button></div>)}</div></div>}
        </article>})}{visibleBusinesses.length===0&&<p className="text-gray-500">No businesses match the current filters.</p>}</div>
      </section>
    </div>}
  </div></main>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
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

  const canAccess = Boolean(user && roleContainsAdmin(role));

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from("local_businesses")
      .select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,image,image_urls,status,approved,created_at,source_name,source_url,import_batch,imported_at,review_notes")
      .order("created_at", { ascending: false });

    if (error) {
      setActionMessage(`Could not load businesses: ${error.message}`);
      return;
    }

    setBusinesses(data || []);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setBusinesses([]);
      setMessage("Please login to access Studio Businesses.");
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

    await loadBusinesses();
    setMessage("");
    setLoading(false);
  }

  async function updateBusinessStatus(id: string, status: string) {
    setActionMessage("Updating business...");
    const payload: any = { status };
    if (status === "approved") {
      payload.approved = true;
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    } else {
      payload.approved = false;
    }

    const { error } = await supabase.from("local_businesses").update(payload).eq("id", id);
    if (error) {
      setActionMessage(`Business update failed: ${error.message}`);
      return;
    }
    setActionMessage(`Business marked ${status}.`);
    await loadBusinesses();
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
    await loadBusinesses();
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

  useEffect(() => { init(); }, []);

  const pending = businesses.filter((business) => business.status !== "approved");
  const approved = businesses.filter((business) => business.status === "approved");
  const imported = businesses.filter((business) => Boolean(business.import_batch));
  const sources = Array.from(new Set(businesses.map((business) => business.source_name).filter(Boolean))).sort();
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

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Businesses Management</h1>
            <p className="text-slate-300 mt-2">Review public submissions and imported business candidates before they appear on the website.</p>
            <p className="text-slate-400 text-sm mt-1">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio businesses"}</p>
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

            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">All Businesses</p><p className="text-3xl font-black">{businesses.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Pending / Non-approved</p><p className="text-3xl font-black">{pending.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Imported Candidates</p><p className="text-3xl font-black">{imported.length}</p></div>
              <div className="bg-white/10 border border-white/10 rounded-2xl p-5"><p className="text-slate-300">Approved</p><p className="text-3xl font-black">{approved.length}</p></div>
            </div>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
                <div><h2 className="text-2xl font-black">Business Review Queue</h2><p className="text-sm text-gray-500 mt-1">Imported records remain private until an administrator approves them.</p></div>
                <div className="grid sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, city, category..." className="border rounded-lg px-3 py-2 min-w-64" />
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border rounded-lg px-3 py-2">
                    <option value="pending">Pending</option><option value="all">All statuses</option><option value="approved">Approved</option><option value="on_hold">On hold</option><option value="rejected">Rejected</option>
                  </select>
                  <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="border rounded-lg px-3 py-2">
                    <option value="all">All sources</option><option value="imported">All imported</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">Showing {visibleBusinesses.length} of {businesses.length} businesses.</p>
              <div className="grid gap-4">
                {visibleBusinesses.map((business) => (
                  <article key={business.id} className="border rounded-xl p-4 grid md:grid-cols-[112px_1fr_auto] gap-4 items-center">
                    <ImageThumb src={getImage(business)} label={business.name} />
                    <div>
                      <h3 className="text-xl font-black">{business.name}</h3>
                      <p className="text-sm text-gray-600">{business.category || "Uncategorized"} · {business.address || "No address"}</p>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {business.website && <CheckedExternalLink href={business.website} notFoundMessage="Page not found. This business website is not available." className="text-sm text-pink-600 font-bold disabled:opacity-60">Business website</CheckedExternalLink>}
                        {business.source_url && <a href={business.source_url} target="_blank" rel="noreferrer" className="text-sm text-blue-700 font-bold">Review source</a>}
                      </div>
                      {(business.offer || business.discount) && <p className="text-sm text-gray-700 mt-2">{business.offer || business.discount}</p>}
                      {business.review_notes && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-3">{business.review_notes}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${statusClass(business.status)}`}>{business.status || "pending"}</span>
                        {business.source_name && <span className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">Source: {business.source_name}</span>}
                        {business.import_batch && <span className="text-xs bg-purple-50 text-purple-800 px-2 py-1 rounded">Batch: {business.import_batch}</span>}
                        {business.poc_email && <span className="text-xs bg-gray-100 px-2 py-1 rounded">POC: {business.poc_email}</span>}
                        {business.poc_phone && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Phone: {business.poc_phone}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:justify-end md:items-center">
                      <a href={`/studio/businesses/${business.id}`} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Review / Edit</a>
                      <button onClick={() => updateBusinessStatus(business.id, "approved")} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Approve</button>
                      <button onClick={() => updateBusinessStatus(business.id, "on_hold")} className="bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold text-sm">On Hold</button>
                      <button onClick={() => updateBusinessStatus(business.id, "rejected")} className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-sm">Reject</button>
                      <button onClick={() => deleteBusiness(business.id, business.name)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
                    </div>
                  </article>
                ))}
                {visibleBusinesses.length === 0 && <p className="text-gray-500">No businesses match the current filters.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

type Business = {
  id: string;
  name: string;
  address?: string | null;
  website?: string | null;
  category?: string | null;
  image?: string | null;
  image_urls?: string[] | null;
  poc_phone?: string | null;
  poc_email?: string | null;
  status?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  import_batch?: string | null;
  review_notes?: string | null;
  created_at?: string | null;
};

function hasImage(row: Business) {
  return Boolean(row.image || (Array.isArray(row.image_urls) && row.image_urls.length));
}

function completeness(row: Business) {
  const checks = [Boolean(row.website), hasImage(row), Boolean(row.poc_phone || row.poc_email), Boolean(row.category), Boolean(row.address), Boolean(row.source_url || !row.import_batch)];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function MissingBadge({ missing, label }: { missing: boolean; label: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${missing ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-800"}`}>{missing ? `Missing ${label}` : `${label} ready`}</span>;
}

export default function BusinessIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("needs_image");
  const [role, setRole] = useState("");
  const [user, setUser] = useState<any>(null);

  async function load() {
    setLoading(true);
    const session = await supabase.auth.getSession();
    const currentUser = session.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access Business Intelligence."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This account does not have Studio admin access."); setLoading(false); return; }
    const { data, error } = await supabase.from("local_businesses").select("id,name,address,website,category,image,image_urls,poc_phone,poc_email,status,source_name,source_url,import_batch,review_notes,created_at").order("created_at", { ascending: false });
    if (error) { setMessage(`Could not load businesses: ${error.message}`); setLoading(false); return; }
    setBusinesses(data || []);
    setMessage("");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total: businesses.length,
    missingImage: businesses.filter((b) => !hasImage(b)).length,
    missingWebsite: businesses.filter((b) => !b.website).length,
    missingContact: businesses.filter((b) => !b.poc_phone && !b.poc_email).length,
    missingCategory: businesses.filter((b) => !b.category).length,
    pending: businesses.filter((b) => String(b.status || "pending") !== "approved").length,
  }), [businesses]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses.filter((b) => {
      const textMatch = !q || [b.name, b.address, b.category, b.source_name, b.import_batch].some((v) => String(v || "").toLowerCase().includes(q));
      const filterMatch = filter === "all" ||
        (filter === "needs_image" && !hasImage(b)) ||
        (filter === "needs_website" && !b.website) ||
        (filter === "needs_contact" && !b.poc_phone && !b.poc_email) ||
        (filter === "needs_category" && !b.category) ||
        (filter === "pending" && String(b.status || "pending") !== "approved") ||
        (filter === "imported" && Boolean(b.import_batch));
      return textMatch && filterMatch;
    }).sort((a, b) => completeness(a) - completeness(b));
  }, [businesses, search, filter]);

  const cards = [
    ["Total Businesses", stats.total, "all"],
    ["Missing Images", stats.missingImage, "needs_image"],
    ["Missing Websites", stats.missingWebsite, "needs_website"],
    ["Missing Contact", stats.missingContact, "needs_contact"],
    ["Missing Category", stats.missingCategory, "needs_category"],
    ["Pending Review", stats.pending, "pending"],
  ] as const;

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-black uppercase tracking-wide text-pink-300">Community Data Operations</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Business Intelligence Center</h1><p className="mt-2 max-w-3xl text-slate-300">Find incomplete listings, prioritize image and website enrichment, and open each record for review before publishing.</p>{user?.email && <p className="mt-2 text-xs text-slate-400">{user.email} · {role}</p>}</div>
        <button onClick={load} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button>
      </div>

      {loading && <div className="rounded-2xl border border-white/10 bg-white/10 p-6">{message}</div>}
      {!loading && message && <div className="rounded-2xl bg-white p-6 text-slate-950">{message}</div>}

      {!loading && !message && <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">{cards.map(([label, value, key]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-2xl border p-5 text-left transition ${filter === key ? "border-pink-400 bg-pink-600" : "border-white/10 bg-white/10 hover:bg-white/15"}`}><p className="text-sm text-slate-200">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></button>)}</section>

        <section className="rounded-3xl bg-white p-6 text-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="text-2xl font-black">Enrichment Queue</h2><p className="mt-1 text-sm text-gray-500">Lowest-completeness listings appear first. Use Review / Edit to upload approved images and correct metadata.</p></div>
            <div className="grid gap-3 sm:grid-cols-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business, city, category..." className="min-w-72 rounded-xl border px-4 py-3"/><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border px-4 py-3"><option value="needs_image">Missing images</option><option value="needs_website">Missing websites</option><option value="needs_contact">Missing contact</option><option value="needs_category">Missing category</option><option value="pending">Pending review</option><option value="imported">Imported listings</option><option value="all">All businesses</option></select></div>
          </div>
          <p className="my-4 text-sm text-gray-500">Showing {visible.length} of {businesses.length} businesses.</p>
          <div className="grid gap-4">{visible.map((business) => {
            const image = business.image || business.image_urls?.[0] || "";
            const score = completeness(business);
            return <article key={business.id} className="grid gap-4 rounded-2xl border p-4 md:grid-cols-[104px_1fr_auto] md:items-center">
              {image ? <img src={image} alt={business.name} className="h-24 w-24 rounded-xl border object-cover"/> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-pink-50 px-2 text-center text-xs font-black text-pink-600">Image needed</div>}
              <div><div className="flex flex-wrap items-center gap-3"><h3 className="text-xl font-black">{business.name}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ${score >= 80 ? "bg-green-100 text-green-800" : score >= 50 ? "bg-yellow-100 text-yellow-900" : "bg-red-100 text-red-800"}`}>{score}% complete</span></div><p className="mt-1 text-sm text-gray-600">{business.category || "Uncategorized"} · {business.address || "No address"}</p><div className="mt-3 flex flex-wrap gap-2"><MissingBadge missing={!hasImage(business)} label="image"/><MissingBadge missing={!business.website} label="website"/><MissingBadge missing={!business.poc_phone && !business.poc_email} label="contact"/><MissingBadge missing={!business.category} label="category"/></div>{business.source_name && <p className="mt-3 text-xs text-gray-500">Source: {business.source_name}{business.import_batch ? ` · Batch: ${business.import_batch}` : ""}</p>}</div>
              <div className="flex flex-wrap gap-2 md:justify-end"><a href={`/studio/businesses/${business.id}`} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">Review / Edit</a>{business.source_url && <a href={business.source_url} target="_blank" rel="noreferrer" className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-black text-blue-700">Check source</a>}{business.website && <a href={business.website} target="_blank" rel="noreferrer" className="rounded-lg border px-4 py-2 text-sm font-black">Website</a>}</div>
            </article>;
          })}{visible.length === 0 && <p className="py-8 text-center text-gray-500">No businesses match this filter.</p>}</div>
        </section>
      </div>}
    </div>
  </main>;
}

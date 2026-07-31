"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
type Draft = {
  is_premium: boolean;
  premium_rank: number;
  premium_starts_at: string;
  premium_ends_at: string;
  premium_label: string;
  premium_payment_reference: string;
  premium_notes: string;
  hero_enabled: boolean;
  hero_title: string;
  hero_subtitle: string;
  hero_starts_at: string;
  hero_ends_at: string;
  hero_rank: number;
};
function dateInput(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function toIso(value: string, end = false) { return value ? new Date(`${value}T${end ? "23:59:59" : "00:00:00"}`).toISOString() : null; }
function firstImage(row: any) { return Array.isArray(row.image_urls) && row.image_urls.length ? row.image_urls[0] : row.image || ""; }
function heroButtonUrl(id: string) { return `/businesses?business=${id}`; }

export default function PremiumBusinessManagerPage() {
  const [loading, setLoading] = useState(true), [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null), [businesses, setBusinesses] = useState<any[]>([]), [drafts, setDrafts] = useState<Record<string, Draft>>({}), [saving, setSaving] = useState("");
  const [search, setSearch] = useState(""), [premiumFilter, setPremiumFilter] = useState("all"), [statusFilter, setStatusFilter] = useState("all"), [categoryFilter, setCategoryFilter] = useState("all");

  async function load() {
    setLoading(true);
    const session = await supabase.auth.getSession(); const currentUser = session.data.session?.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please log in to manage premium businesses."); setLoading(false); return; }
    const admin = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (!String(admin.data?.role || "").toLowerCase().includes("admin")) { setMessage("Studio admin access is required."); setLoading(false); return; }
    const [businessResult, heroResult] = await Promise.all([
      supabase.from("local_businesses").select("id,name,address,category,status,offer,discount,image,image_urls,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label,premium_payment_reference,premium_notes").order("name"),
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_url,start_date,end_date,display_order,active,banner_type").eq("banner_type", "business")
    ]);
    if (businessResult.error) { setMessage(businessResult.error.message.includes("is_premium") ? "Run the premium business migration before using this page." : businessResult.error.message); setLoading(false); return; }
    const rows = businessResult.data || []; const heroRows = heroResult.error ? [] : (heroResult.data || []); setBusinesses(rows); const next: Record<string, Draft> = {};
    rows.forEach((row: any) => {
      const hero = heroRows.find((entry: any) => entry.button_url === heroButtonUrl(row.id));
      next[row.id] = {
        is_premium: Boolean(row.is_premium), premium_rank: Number(row.premium_rank || 100), premium_starts_at: dateInput(row.premium_starts_at), premium_ends_at: dateInput(row.premium_ends_at), premium_label: row.premium_label || "Premium", premium_payment_reference: row.premium_payment_reference || "", premium_notes: row.premium_notes || "",
        hero_enabled: Boolean(hero?.active), hero_title: hero?.title || row.name, hero_subtitle: hero?.subtitle || row.discount || row.offer || `${row.category || "Local business"} featured by Seattle Desi TV.`, hero_starts_at: dateInput(hero?.start_date), hero_ends_at: dateInput(hero?.end_date), hero_rank: Number(hero?.display_order ?? 50)
      };
    });
    setDrafts(next); setMessage(heroResult.error ? "Premium placements loaded. Hero-banner access could not be loaded." : ""); setLoading(false);
  }
  useEffect(() => { load(); }, []);
  function update(id: string, patch: Partial<Draft>) { setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }

  async function syncBusinessHero(business: any, draft: Draft) {
    const buttonUrl = heroButtonUrl(business.id);
    const existing = await supabase.from("homepage_hero_banners").select("id").eq("banner_type", "business").eq("button_url", buttonUrl).maybeSingle();
    if (!draft.hero_enabled) {
      if (existing.data?.id) {
        const disabled = await supabase.from("homepage_hero_banners").update({ active: false }).eq("id", existing.data.id);
        if (disabled.error) throw disabled.error;
      }
      return;
    }
    if (!draft.is_premium) throw new Error("Enable premium placement before enabling homepage hero placement.");
    if (business.status !== "approved") throw new Error("Only approved businesses can appear in the homepage hero.");
    const imageUrl = firstImage(business);
    if (!imageUrl) throw new Error("Add a business image before enabling homepage hero placement.");
    const payload = {
      title: draft.hero_title.trim() || business.name,
      subtitle: draft.hero_subtitle.trim() || business.discount || business.offer || `${business.category || "Local business"} featured by Seattle Desi TV.`,
      image_url: imageUrl,
      button_text: "View Business",
      button_url: buttonUrl,
      banner_type: "business",
      start_date: draft.hero_starts_at || null,
      end_date: draft.hero_ends_at || null,
      display_order: Math.max(0, Math.min(9999, Number(draft.hero_rank || 50))),
      active: true
    };
    if (existing.data?.id) {
      const result = await supabase.from("homepage_hero_banners").update(payload).eq("id", existing.data.id);
      if (result.error) throw result.error;
    } else {
      const result = await supabase.from("homepage_hero_banners").insert(payload);
      if (result.error) throw result.error;
    }
  }

  async function save(business: any) {
    const draft = drafts[business.id]; if (!draft) return; setSaving(business.id); setMessage("");
    try {
      const { error } = await supabase.from("local_businesses").update({ is_premium: draft.is_premium, premium_rank: Math.max(0, Math.min(9999, Number(draft.premium_rank || 100))), premium_starts_at: toIso(draft.premium_starts_at), premium_ends_at: toIso(draft.premium_ends_at, true), premium_label: draft.premium_label.trim() || "Premium", premium_payment_reference: draft.premium_payment_reference.trim() || null, premium_notes: draft.premium_notes.trim() || null, premium_updated_at: new Date().toISOString(), premium_updated_by: user?.id || null }).eq("id", business.id);
      if (error) throw error;
      await syncBusinessHero(business, draft);
      await supabase.from("business_activity_log").insert({ business_id: business.id, activity_type: "premium_listing_updated", activity_label: draft.hero_enabled ? "Premium placement and homepage hero enabled" : draft.is_premium ? "Premium placement enabled" : "Premium placement disabled", actor_email: user?.email || null, details: { rank: draft.premium_rank, starts_at: draft.premium_starts_at || null, ends_at: draft.premium_ends_at || null, payment_reference: draft.premium_payment_reference || null, hero_enabled: draft.hero_enabled, hero_rank: draft.hero_rank, hero_starts_at: draft.hero_starts_at || null, hero_ends_at: draft.hero_ends_at || null } });
      setMessage(`${business.name} paid placement saved.`); await load();
    } catch (error: any) { setMessage(`Could not save ${business.name}: ${error.message || error}`); }
    finally { setSaving(""); }
  }

  const categories = useMemo(() => Array.from(new Set(businesses.map((business) => String(business.category || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [businesses]);
  const statuses = useMemo(() => Array.from(new Set(businesses.map((business) => String(business.status || "pending").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [businesses]);
  const filteredBusinesses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return businesses.filter((business) => {
      const draft = drafts[business.id];
      const matchesSearch = !query || [business.name, business.address, business.category, business.status, draft?.premium_label, draft?.premium_payment_reference, draft?.hero_title].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesPremium = premiumFilter === "all" || (premiumFilter === "premium" ? Boolean(draft?.is_premium) : !draft?.is_premium);
      const matchesStatus = statusFilter === "all" || String(business.status || "pending") === statusFilter;
      const matchesCategory = categoryFilter === "all" || String(business.category || "") === categoryFilter;
      return matchesSearch && matchesPremium && matchesStatus && matchesCategory;
    });
  }, [businesses, drafts, search, premiumFilter, statusFilter, categoryFilter]);
  const filtersActive = Boolean(search.trim() || premiumFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all");
  function clearFilters() { setSearch(""); setPremiumFilter("all"); setStatusFilter("all"); setCategoryFilter("all"); }

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><div className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-amber-300">Paid Placement</p><h1 className="mt-2 text-4xl font-black">Premium Business Manager</h1><p className="mt-2 text-slate-300">Manage directory priority and optional higher-tier homepage hero placement.</p></div><div className="flex gap-3"><a href="/studio/businesses" className="rounded-xl border border-white/30 px-4 py-3 font-bold">Back to Businesses</a><button onClick={load} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950">Refresh</button></div></div>{message&&<div className="mb-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}{!loading&&businesses.length>0&&<section className="mb-6 rounded-2xl border border-white/10 bg-white/10 p-4"><div className="relative"><span className="pointer-events-none absolute left-4 top-3.5 text-slate-400">⌕</span><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by business, city, category, payment reference or hero title..." className="w-full rounded-xl border border-white/15 bg-slate-900 py-3 pl-11 pr-4 text-white outline-none focus:border-amber-300"/></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><select value={premiumFilter} onChange={(e)=>setPremiumFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white"><option value="all">All placements</option><option value="premium">Premium only</option><option value="standard">Standard only</option></select><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white"><option value="all">All listing statuses</option>{statuses.map((status)=><option key={status} value={status}>{status}</option>)}</select><select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-white"><option value="all">All categories</option>{categories.map((category)=><option key={category} value={category}>{category}</option>)}</select><button onClick={clearFilters} disabled={!filtersActive} className="rounded-xl border border-amber-300/50 px-4 py-3 font-bold text-amber-200 disabled:opacity-40">Clear</button></div><p className="mt-3 text-sm text-slate-300">Showing <b className="text-white">{filteredBusinesses.length}</b> of {businesses.length} businesses</p></section>}{loading?<div className="rounded-2xl bg-white/10 p-6">Loading...</div>:filteredBusinesses.length===0?<div className="rounded-2xl border border-white/10 bg-white/10 p-8 text-center"><h2 className="text-xl font-black">No businesses match these filters</h2><button onClick={clearFilters} className="mt-4 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950">Clear filters</button></div>:<div className="space-y-5">{filteredBusinesses.map((business) => { const draft = drafts[business.id]; if (!draft) return null; return <article key={business.id} className={`rounded-2xl border p-5 ${draft.is_premium ? "border-amber-300 bg-amber-50 text-slate-950" : "border-white/10 bg-white/10"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black">{business.name}</h2><p className={draft.is_premium?"text-slate-600":"text-slate-300"}>{business.category || "Uncategorised"} · {business.address}</p><p className="mt-1 text-xs font-bold uppercase">Listing status: {business.status || "pending"}</p></div><div className="flex flex-wrap gap-3"><label className="flex items-center gap-3 rounded-xl border px-4 py-3 font-black"><input type="checkbox" checked={draft.is_premium} onChange={(e)=>update(business.id,{is_premium:e.target.checked,hero_enabled:e.target.checked?draft.hero_enabled:false})}/><span>Premium directory placement</span></label><label className="flex items-center gap-3 rounded-xl border border-pink-400 px-4 py-3 font-black"><input type="checkbox" checked={draft.hero_enabled} onChange={(e)=>update(business.id,{hero_enabled:e.target.checked})}/><span>Homepage hero placement</span></label></div></div><div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold">Display label<input value={draft.premium_label} onChange={(e)=>update(business.id,{premium_label:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Directory rank<input type="number" min="0" max="9999" value={draft.premium_rank} onChange={(e)=>update(business.id,{premium_rank:Number(e.target.value)})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Premium starts<input type="date" value={draft.premium_starts_at} onChange={(e)=>update(business.id,{premium_starts_at:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Premium ends<input type="date" value={draft.premium_ends_at} onChange={(e)=>update(business.id,{premium_ends_at:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold md:col-span-2">Payment / invoice reference<input value={draft.premium_payment_reference} onChange={(e)=>update(business.id,{premium_payment_reference:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950" placeholder="Internal only"/></label><label className="text-sm font-bold md:col-span-2">Internal notes<input value={draft.premium_notes} onChange={(e)=>update(business.id,{premium_notes:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label></div>{draft.hero_enabled&&<section className="mt-5 rounded-2xl border border-pink-300 bg-pink-50 p-5 text-slate-950"><p className="text-xs font-black uppercase tracking-widest text-pink-600">Higher-tier homepage placement</p><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold md:col-span-2">Hero title<input value={draft.hero_title} onChange={(e)=>update(business.id,{hero_title:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"/></label><label className="text-sm font-bold lg:col-span-2">Hero priority<input type="number" min="0" max="9999" value={draft.hero_rank} onChange={(e)=>update(business.id,{hero_rank:Number(e.target.value)})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"/><span className="mt-1 block text-xs font-normal text-slate-500">Lower numbers appear earlier among other hero slides.</span></label><label className="text-sm font-bold md:col-span-2 lg:col-span-4">Hero subtitle<textarea value={draft.hero_subtitle} onChange={(e)=>update(business.id,{hero_subtitle:e.target.value})} className="mt-1 min-h-20 w-full rounded-lg border bg-white px-3 py-2"/></label><label className="text-sm font-bold">Hero starts<input type="date" value={draft.hero_starts_at} onChange={(e)=>update(business.id,{hero_starts_at:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"/></label><label className="text-sm font-bold">Hero ends<input type="date" value={draft.hero_ends_at} onChange={(e)=>update(business.id,{hero_ends_at:e.target.value})} className="mt-1 w-full rounded-lg border bg-white px-3 py-2"/></label><div className="rounded-xl bg-white p-3 text-sm md:col-span-2"><b>Hero image:</b> Uses the business’s current primary image.<br/><b>Button:</b> View Business</div></div></section>}<button disabled={saving===business.id} onClick={()=>save(business)} className="mt-5 rounded-xl bg-amber-500 px-5 py-3 font-black text-slate-950 disabled:opacity-50">{saving===business.id?"Saving...":"Save paid placement"}</button></article>})}</div>}</div></main>;
}

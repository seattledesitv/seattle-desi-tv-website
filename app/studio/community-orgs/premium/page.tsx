"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

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
function firstImage(row: any) { return Array.isArray(row?.image_urls) && row.image_urls[0] ? row.image_urls[0] : row?.image || ""; }
function heroButtonUrl(id: string) { return `/community-organizations/${id}`; }

export default function PremiumOrganizationManagerPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState("");
  const [search, setSearch] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please log in to manage organization placements."); setLoading(false); return; }
    const role = await resolveUserRole(supabase, currentUser);
    if (!isAdminRole(role)) { setMessage("Studio admin access is required."); setLoading(false); return; }

    const [organizationResult, heroResult] = await Promise.all([
      supabase.from("community_organizations").select("id,name,organization_type,category,location,status,approved,description,image,image_urls,is_premium,premium_rank,premium_starts_at,premium_ends_at,premium_label,premium_payment_reference,premium_notes").order("name"),
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_url,start_date,end_date,display_order,active,banner_type").eq("banner_type", "organization")
    ]);

    if (organizationResult.error) {
      setMessage(/is_premium|premium_/i.test(organizationResult.error.message || "") ? "Run the organization premium migration before using this page." : organizationResult.error.message);
      setLoading(false);
      return;
    }

    const rows = organizationResult.data || [];
    const heroRows = heroResult.error ? [] : heroResult.data || [];
    const next: Record<string, Draft> = {};
    rows.forEach((row: any) => {
      const hero = heroRows.find((entry: any) => entry.button_url === heroButtonUrl(row.id));
      next[row.id] = {
        is_premium: Boolean(row.is_premium),
        premium_rank: Number(row.premium_rank || 100),
        premium_starts_at: dateInput(row.premium_starts_at),
        premium_ends_at: dateInput(row.premium_ends_at),
        premium_label: row.premium_label || "Premium",
        premium_payment_reference: row.premium_payment_reference || "",
        premium_notes: row.premium_notes || "",
        hero_enabled: Boolean(hero?.active),
        hero_title: hero?.title || row.name,
        hero_subtitle: hero?.subtitle || row.description || `${row.category || row.organization_type || "Community organization"} featured by Seattle Desi TV.`,
        hero_starts_at: dateInput(hero?.start_date),
        hero_ends_at: dateInput(hero?.end_date),
        hero_rank: Number(hero?.display_order ?? 50)
      };
    });
    setOrganizations(rows);
    setDrafts(next);
    setMessage(heroResult.error ? "Premium placements loaded, but hero-banner access could not be loaded." : "");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  function update(id: string, patch: Partial<Draft>) { setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } })); }

  async function syncHero(organization: any, draft: Draft) {
    const buttonUrl = heroButtonUrl(organization.id);
    const existing = await supabase.from("homepage_hero_banners").select("id").eq("banner_type", "organization").eq("button_url", buttonUrl).maybeSingle();
    if (!draft.hero_enabled) {
      if (existing.data?.id) {
        const result = await supabase.from("homepage_hero_banners").update({ active: false }).eq("id", existing.data.id);
        if (result.error) throw result.error;
      }
      return;
    }
    if (!draft.is_premium) throw new Error("Enable premium placement before enabling homepage hero placement.");
    if (organization.status !== "approved" || organization.approved !== true) throw new Error("Only approved organizations can appear in the homepage hero.");
    const imageUrl = firstImage(organization);
    if (!imageUrl) throw new Error("Add an organization image before enabling homepage hero placement.");
    const payload = {
      title: draft.hero_title.trim() || organization.name,
      subtitle: draft.hero_subtitle.trim() || organization.description || `${organization.category || organization.organization_type || "Community organization"} featured by Seattle Desi TV.`,
      image_url: imageUrl,
      button_text: "View Organization",
      button_url: buttonUrl,
      banner_type: "organization",
      start_date: draft.hero_starts_at || null,
      end_date: draft.hero_ends_at || null,
      display_order: Math.max(0, Math.min(9999, Number(draft.hero_rank || 50))),
      active: true
    };
    const result = existing.data?.id
      ? await supabase.from("homepage_hero_banners").update(payload).eq("id", existing.data.id)
      : await supabase.from("homepage_hero_banners").insert(payload);
    if (result.error) throw result.error;
  }

  async function save(organization: any) {
    const draft = drafts[organization.id];
    if (!draft) return;
    setSaving(organization.id);
    setMessage("");
    try {
      const result = await supabase.from("community_organizations").update({
        is_premium: draft.is_premium,
        premium_rank: Math.max(0, Math.min(9999, Number(draft.premium_rank || 100))),
        premium_starts_at: toIso(draft.premium_starts_at),
        premium_ends_at: toIso(draft.premium_ends_at, true),
        premium_label: draft.premium_label.trim() || "Premium",
        premium_payment_reference: draft.premium_payment_reference.trim() || null,
        premium_notes: draft.premium_notes.trim() || null,
        premium_updated_at: new Date().toISOString(),
        premium_updated_by: user?.id || null
      }).eq("id", organization.id);
      if (result.error) throw result.error;
      await syncHero(organization, draft);
      setMessage(`${organization.name} placement saved.`);
      await load();
    } catch (error: any) {
      setMessage(`Could not save ${organization.name}: ${error?.message || error}`);
    } finally {
      setSaving("");
    }
  }

  const statuses = useMemo(() => Array.from(new Set(organizations.map((item) => String(item.status || "pending")))).sort(), [organizations]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return organizations.filter((organization) => {
      const draft = drafts[organization.id];
      const matchesSearch = !query || [organization.name, organization.location, organization.category, organization.organization_type, draft?.premium_label, draft?.premium_payment_reference, draft?.hero_title].some((value) => String(value || "").toLowerCase().includes(query));
      const matchesPremium = premiumFilter === "all" || (premiumFilter === "premium" ? Boolean(draft?.is_premium) : !draft?.is_premium);
      const matchesStatus = statusFilter === "all" || String(organization.status || "pending") === statusFilter;
      return matchesSearch && matchesPremium && matchesStatus;
    });
  }, [organizations, drafts, search, premiumFilter, statusFilter]);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><section className="mx-auto max-w-6xl px-6 py-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-amber-300">Paid Placement</p><h1 className="mt-2 text-4xl font-black">Premium Organization Manager</h1><p className="mt-2 text-slate-300">Manage organization directory priority and optional homepage hero placement using the same model as businesses.</p></div><div className="flex gap-3"><a href="/studio/community-orgs" className="rounded-xl border border-white/30 px-4 py-3 font-bold">Back to Organizations</a><button onClick={load} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950">Refresh</button></div></div>
    {message && <div className="mb-6 rounded-xl bg-amber-100 p-4 font-bold text-amber-900">{message}</div>}
    {!loading && organizations.length > 0 && <section className="mb-6 rounded-2xl border border-white/10 bg-white/10 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations, location, category, payment reference or hero title..." className="w-full rounded-xl border border-white/15 bg-slate-900 px-4 py-3 text-white"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><select value={premiumFilter} onChange={(event) => setPremiumFilter(event.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-3 py-3"><option value="all">All placements</option><option value="premium">Premium only</option><option value="standard">Standard only</option></select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-white/15 bg-slate-900 px-3 py-3"><option value="all">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select></div></section>}
    {loading ? <div className="rounded-2xl bg-white/10 p-6">Loading...</div> : <div className="space-y-5">{filtered.map((organization) => { const draft = drafts[organization.id]; if (!draft) return null; return <article key={organization.id} className={`rounded-2xl border p-5 ${draft.is_premium ? "border-amber-300 bg-amber-50 text-slate-950" : "border-white/10 bg-white/10"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-xl font-black">{organization.name}</h2><p className={draft.is_premium ? "text-slate-600" : "text-slate-300"}>{organization.category || organization.organization_type || "Community organization"} · {organization.location || "Seattle Area"}</p><p className="mt-1 text-xs font-bold uppercase">Listing status: {organization.status || "pending"}</p></div><div className="flex flex-wrap gap-3"><label className="flex items-center gap-3 rounded-xl border px-4 py-3 font-black"><input type="checkbox" checked={draft.is_premium} onChange={(event) => update(organization.id, { is_premium: event.target.checked, hero_enabled: event.target.checked ? draft.hero_enabled : false })}/><span>Premium directory placement</span></label><label className="flex items-center gap-3 rounded-xl border border-pink-400 px-4 py-3 font-black"><input type="checkbox" checked={draft.hero_enabled} onChange={(event) => update(organization.id, { hero_enabled: event.target.checked })}/><span>Homepage hero placement</span></label></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold">Display label<input value={draft.premium_label} onChange={(event) => update(organization.id, { premium_label: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Directory rank<input type="number" min="0" max="9999" value={draft.premium_rank} onChange={(event) => update(organization.id, { premium_rank: Number(event.target.value) })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Premium starts<input type="date" value={draft.premium_starts_at} onChange={(event) => update(organization.id, { premium_starts_at: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Premium ends<input type="date" value={draft.premium_ends_at} onChange={(event) => update(organization.id, { premium_ends_at: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label></div>
      <div className="mt-5 rounded-2xl border border-pink-200 bg-white/80 p-4 text-slate-950"><h3 className="font-black">Homepage Hero</h3><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold lg:col-span-2">Hero title<input value={draft.hero_title} onChange={(event) => update(organization.id, { hero_title: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm font-bold lg:col-span-2">Hero subtitle<input value={draft.hero_subtitle} onChange={(event) => update(organization.id, { hero_subtitle: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm font-bold">Hero starts<input type="date" value={draft.hero_starts_at} onChange={(event) => update(organization.id, { hero_starts_at: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm font-bold">Hero ends<input type="date" value={draft.hero_ends_at} onChange={(event) => update(organization.id, { hero_ends_at: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label><label className="text-sm font-bold">Hero rank<input type="number" min="0" max="9999" value={draft.hero_rank} onChange={(event) => update(organization.id, { hero_rank: Number(event.target.value) })} className="mt-1 w-full rounded-lg border px-3 py-2"/></label></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Payment reference<input value={draft.premium_payment_reference} onChange={(event) => update(organization.id, { premium_payment_reference: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label><label className="text-sm font-bold">Internal notes<input value={draft.premium_notes} onChange={(event) => update(organization.id, { premium_notes: event.target.value })} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-slate-950"/></label></div><button onClick={() => save(organization)} disabled={saving === organization.id} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-50">{saving === organization.id ? "Saving..." : "Save Placement"}</button>
    </article>; })}{filtered.length === 0 && <div className="rounded-2xl bg-white/10 p-8 text-center">No organizations match the selected filters.</div>}</div>}
  </section></main>;
}

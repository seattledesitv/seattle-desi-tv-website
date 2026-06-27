"use client";

import { useEffect, useMemo, useState } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import CheckedExternalLink from "./CheckedExternalLink";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Kind = "groups" | "organizations";
const configs = {
  groups: {
    table: "community_groups",
    title: "Indian Community Groups",
    kicker: "WhatsApp, Facebook, Telegram and local networks",
    subtitle: "Find Indian community groups around Seattle and submit groups that help the community connect.",
    addLabel: "Submit Community Group",
    loginNext: "/community-groups",
    urlLabel: "Group Link",
  },
  organizations: {
    table: "community_organizations",
    title: "Indian Community Organizations",
    kicker: "Nonprofits, associations, cultural groups and temples",
    subtitle: "Discover Indian community organizations and submit organizations for SDTV admin approval.",
    addLabel: "Submit Organization",
    loginNext: "/community-organizations",
    urlLabel: "Website / Page",
  },
};

function blank(kind: Kind) {
  return kind === "groups"
    ? { name: "", platform: "WhatsApp", category: "", language: "", location: "Seattle Area", description: "", group_url: "", contact_name: "", contact_email: "", contact_phone: "" }
    : { name: "", organization_type: "", category: "", location: "Seattle Area", website: "", description: "", contact_name: "", contact_email: "", contact_phone: "" };
}
function norm(v: string) { return String(v || "").toLowerCase(); }
function linkFor(row: any) { return row.group_url || row.website || ""; }
function tag(value?: string | null) { return value ? <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{value}</span> : null; }

export default function CommunityDirectoryPage({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(blank(kind));
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(() => { const q = norm(searchText); return items.filter((item) => { if (categoryFilter !== "all" && item.category !== categoryFilter) return false; if (!q) return true; return norm(`${item.name || ""} ${item.category || ""} ${item.location || ""} ${item.description || ""} ${item.platform || ""} ${item.organization_type || ""}`).includes(q); }); }, [items, searchText, categoryFilter]);

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUser(auth?.user || null);
    const columns = kind === "groups" ? "id,name,platform,category,language,location,description,group_url,contact_name,contact_email,created_at" : "id,name,organization_type,category,location,website,description,contact_name,contact_email,created_at";
    const { data, error } = await supabase.from(config.table).select(columns).eq("status", "approved").eq("approved", true).order("created_at", { ascending: false });
    setItems(data || []);
    setMessage(error ? `Could not load listings: ${error.message}` : "");
    setLoading(false);
  }
  function setField(k: string, v: string) { setForm((c: any) => ({ ...c, [k]: v })); }
  function validate() {
    if (!form.name?.trim()) return "Name is required.";
    if (!form.category?.trim()) return "Category is required.";
    if (!form.location?.trim()) return "Location is required.";
    const url = kind === "groups" ? form.group_url : form.website;
    if (!url?.trim()) return `${config.urlLabel} is required.`;
    return "";
  }
  async function submit() {
    if (!user?.id) { setMessage("Please login before submitting a listing."); return; }
    const validation = validate();
    if (validation) { setMessage(validation); return; }
    setSubmitting(true);
    const payload = { ...form, submitted_by: user.id, submitted_email: user.email, status: "pending", approved: false, updated_at: new Date().toISOString() };
    const { error } = await supabase.from(config.table).insert(payload);
    setSubmitting(false);
    if (error) { setMessage(`Submission failed: ${error.message}`); return; }
    setMessage("Submitted for SDTV admin approval. It will appear publicly after approval.");
    setForm(blank(kind));
  }
  useEffect(() => { load(); }, [kind]);

  return <main className="min-h-screen bg-slate-950 text-white"><SiteHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="rounded-[2rem] bg-white/10 p-8 md:p-10"><p className="font-black uppercase tracking-wide text-pink-300">{config.kicker}</p><h1 className="mt-3 text-4xl font-black md:text-6xl">{config.title}</h1><p className="mt-3 max-w-3xl text-slate-300">{config.subtitle}</p><div className="mt-6 flex flex-wrap gap-3"><a href="#submit" className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">{config.addLabel}</a><a href={kind === "groups" ? "/community-organizations" : "/community-groups"} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">{kind === "groups" ? "View Organizations" : "View Groups"}</a></div></div>{message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}<section className="mt-8 rounded-3xl bg-white p-6 text-slate-950"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-2xl font-black">Approved Listings</h2><div className="grid gap-2 md:grid-cols-[260px_200px]"><input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search listings..." className="rounded-xl border p-3 font-bold" /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border p-3 font-bold"><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div></div>{loading && <p className="mt-5 text-slate-500">Loading...</p>}<div className="mt-5 grid gap-4 md:grid-cols-2">{filtered.map((item) => <article key={item.id} className="rounded-3xl border bg-slate-50 p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-2xl font-black">{item.name}</h3><p className="mt-1 text-sm font-bold text-slate-500">{item.location || "Seattle Area"}</p></div><div className="flex flex-wrap gap-2">{tag(item.platform || item.organization_type)}{tag(item.category)}{tag(item.language)}</div></div>{item.description && <p className="mt-4 text-slate-700">{item.description}</p>}<div className="mt-4 flex flex-wrap gap-3">{linkFor(item) && <CheckedExternalLink href={linkFor(item)} notFoundMessage="This community link is not available." className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Open Link</CheckedExternalLink>}{item.contact_email && <a href={`mailto:${item.contact_email}`} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 border">Contact</a>}</div></article>)}{!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 font-bold text-slate-500 md:col-span-2">No approved listings found yet.</p>}</div></section><section id="submit" className="mt-8 rounded-3xl bg-white p-6 text-slate-950"><h2 className="text-2xl font-black">{config.addLabel}</h2><p className="mt-2 text-sm font-bold text-slate-500">Login is required to submit. Public listing is shown only after SDTV admin approval.</p>{!user?.id ? <a href={`/login?next=${config.loginNext}`} className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login to Submit</a> : <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-black">Name<input value={form.name} onChange={(e) => setField("name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>{kind === "groups" ? <label className="grid gap-1 text-sm font-black">Platform<select value={form.platform} onChange={(e) => setField("platform", e.target.value)} className="rounded-xl border p-3 font-normal"><option>WhatsApp</option><option>Facebook</option><option>Telegram</option><option>Discord</option><option>Meetup</option><option>Other</option></select></label> : <label className="grid gap-1 text-sm font-black">Organization Type<input value={form.organization_type} onChange={(e) => setField("organization_type", e.target.value)} placeholder="Nonprofit, Temple, Association..." className="rounded-xl border p-3 font-normal" /></label>}<label className="grid gap-1 text-sm font-black">Category<input value={form.category} onChange={(e) => setField("category", e.target.value)} placeholder="Telugu, Tamil, Marathi, Youth, Seniors..." className="rounded-xl border p-3 font-normal" /></label>{kind === "groups" && <label className="grid gap-1 text-sm font-black">Language / Region<input value={form.language} onChange={(e) => setField("language", e.target.value)} className="rounded-xl border p-3 font-normal" /></label>}<label className="grid gap-1 text-sm font-black">Location<input value={form.location} onChange={(e) => setField("location", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">{config.urlLabel}<input value={kind === "groups" ? form.group_url : form.website} onChange={(e) => setField(kind === "groups" ? "group_url" : "website", e.target.value)} placeholder="https://..." className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Name<input value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black">Contact Email<input value={form.contact_email} onChange={(e) => setField("contact_email", e.target.value)} className="rounded-xl border p-3 font-normal" /></label><label className="grid gap-1 text-sm font-black md:col-span-2">Description<textarea value={form.description} onChange={(e) => setField("description", e.target.value)} className="min-h-28 rounded-xl border p-3 font-normal" /></label><button onClick={submit} disabled={submitting} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60 md:col-span-2">{submitting ? "Submitting..." : "Submit for Approval"}</button></div>}</section></section><SiteFooter /></main>;
}

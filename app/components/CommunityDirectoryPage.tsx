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
    subtitle: "Discover Indian community organizations and the events they organize, sponsor, or support.",
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

function norm(value: string) { return String(value || "").toLowerCase(); }
function linkFor(row: any) { return row.group_url || row.website || ""; }
function tag(value?: string | null) { return value ? <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-700">{value}</span> : null; }
function dateText(value?: string | null) { if (!value) return ""; const date = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function eventImage(event: any) { return Array.isArray(event?.image_urls) && event.image_urls[0] ? event.image_urls[0] : event?.image || ""; }

export default function CommunityDirectoryPage({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [eventLinks, setEventLinks] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [form, setForm] = useState<any>(blank(kind));
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(() => {
    const query = norm(searchText);
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!query) return true;
      return norm(`${item.name || ""} ${item.category || ""} ${item.location || ""} ${item.description || ""} ${item.platform || ""} ${item.organization_type || ""}`).includes(query);
    });
  }, [items, searchText, categoryFilter]);

  function linksFor(organizationId: string) {
    return eventLinks.filter((link) => link.organization_id === organizationId && link.events);
  }

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setUser(auth?.user || null);
    const columns = kind === "groups"
      ? "id,name,platform,category,language,location,description,group_url,contact_name,contact_email,created_at"
      : "id,name,organization_type,category,location,website,description,contact_name,contact_email,created_at";
    const listingResult = await supabase.from(config.table).select(columns).eq("status", "approved").eq("approved", true).order("created_at", { ascending: false });
    setItems(listingResult.data || []);
    if (kind === "organizations") {
      const linksResult = await supabase.from("event_organizations").select("id,organization_id,relationship,is_primary,display_order,events(id,title,date,location,image,image_urls,status,approved)").order("display_order", { ascending: true });
      setEventLinks((linksResult.data || []).filter((link: any) => link.events?.approved || link.events?.status === "approved"));
      if (linksResult.error && !listingResult.error) setMessage(`Organizations loaded, but linked events could not be loaded: ${linksResult.error.message}`);
    } else {
      setEventLinks([]);
    }
    if (listingResult.error) setMessage(`Could not load listings: ${listingResult.error.message}`);
    else if (kind !== "organizations") setMessage("");
    setLoading(false);
  }

  function openForm() { setShowForm(true); setTimeout(() => document.getElementById("submit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  function setField(key: string, value: string) { setForm((current: any) => ({ ...current, [key]: value })); }
  function validate() { if (!form.name?.trim()) return "Name is required."; if (!form.category?.trim()) return "Category is required."; if (!form.location?.trim()) return "Location is required."; const url = kind === "groups" ? form.group_url : form.website; if (!url?.trim()) return `${config.urlLabel} is required.`; return ""; }

  async function submit() {
    if (!user?.id) { setMessage("Please login before submitting a listing."); return; }
    const validation = validate();
    if (validation) { setMessage(validation); return; }
    setSubmitting(true);
    const payload = { ...form, submitted_by: user.id, submitted_email: user.email, status: "pending", approved: false, updated_at: new Date().toISOString() };
    const { error } = await supabase.from(config.table).insert(payload);
    setSubmitting(false);
    if (error) { setMessage(`Submission failed: ${error.message}`); return; }
    setMessage("Submitted for SDTV admin approval. You can track or edit it from My Hub → My Community Submissions.");
    setForm(blank(kind));
    setShowForm(false);
  }

  useEffect(() => { load(); }, [kind]);

  return <main className="min-h-screen bg-slate-950 text-white">
    <SiteHeader />
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-[2rem] bg-white/10 p-8 md:p-10">
        <p className="font-black uppercase tracking-wide text-pink-300">{config.kicker}</p>
        <h1 className="mt-3 text-4xl font-black md:text-6xl">{config.title}</h1>
        <p className="mt-3 max-w-3xl text-slate-300">{config.subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={openForm} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">{config.addLabel}</button>
          <a href="/my-community-submissions" className="rounded-xl bg-white/10 px-5 py-3 font-black text-white">My Submissions</a>
          <a href={kind === "groups" ? "/community-organizations" : "/community-groups"} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">{kind === "groups" ? "View Organizations" : "View Groups"}</a>
        </div>
      </div>

      {message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}

      <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-black">Approved Listings</h2>
          <div className="grid gap-2 md:grid-cols-[260px_200px]">
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search listings..." className="rounded-xl border p-3 font-bold" />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border p-3 font-bold">
              <option value="all">All categories</option>
              {categories.map((category) => <option key={String(category)} value={String(category)}>{String(category)}</option>)}
            </select>
          </div>
        </div>
        {loading && <p className="mt-5 text-slate-500">Loading...</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const links = kind === "organizations" ? linksFor(item.id) : [];
            const today = new Date().toISOString().split("T")[0];
            const upcoming = links.filter((link: any) => String(link.events?.date || "") >= today).sort((a: any, b: any) => String(a.events.date).localeCompare(String(b.events.date)));
            const past = links.filter((link: any) => String(link.events?.date || "") < today).sort((a: any, b: any) => String(b.events.date).localeCompare(String(a.events.date)));
            const expanded = expandedId === item.id;
            return <article key={item.id} className={`rounded-3xl border bg-slate-50 p-5 transition ${expanded ? "md:col-span-2 border-pink-200 shadow-lg" : ""}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div><h3 className="text-2xl font-black">{item.name}</h3><p className="mt-1 text-sm font-bold text-slate-500">{item.location || "Seattle Area"}</p></div>
                <div className="flex flex-wrap gap-2">{tag(item.platform || item.organization_type)}{tag(item.category)}{tag(item.language)}</div>
              </div>
              {item.description && <p className="mt-4 text-slate-700">{item.description}</p>}
              {kind === "organizations" && <div className="mt-4 flex flex-wrap gap-2 text-xs font-black"><span className="rounded-full bg-white px-3 py-1 border">{links.length} linked event{links.length === 1 ? "" : "s"}</span><span className="rounded-full bg-green-50 px-3 py-1 text-green-700">{upcoming.length} upcoming</span>{past.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{past.length} past</span>}</div>}
              <div className="mt-4 flex flex-wrap gap-3">
                {linkFor(item) && <CheckedExternalLink href={linkFor(item)} notFoundMessage="This community link is not available." className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60">Open Link</CheckedExternalLink>}
                {item.contact_email && <a href={`mailto:${item.contact_email}`} className="rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-950">Contact</a>}
                {kind === "organizations" && <button type="button" onClick={() => setExpandedId(expanded ? "" : item.id)} className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2 text-sm font-black text-pink-700">{expanded ? "Hide Events" : links.length ? "Show Events" : "Event History"} {expanded ? "▲" : "▼"}</button>}
                {kind === "organizations" && <a href={`/community-organizations/${item.id}`} className="rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-950">View Profile →</a>}
              </div>
              {expanded && <div className="mt-5 border-t pt-5">
                <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Connected Events</p><h4 className="mt-1 text-xl font-black">Upcoming Events</h4></div><a href={`/community-organizations/${item.id}`} className="text-sm font-black text-pink-600">View full profile →</a></div>
                {upcoming.length > 0 ? <div className="mt-4 grid gap-3 md:grid-cols-3">{upcoming.slice(0, 3).map((link: any) => { const event = link.events; const image = eventImage(event); return <a key={link.id} href={`/events/${event.id}`} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-md">{image ? <img src={image} alt={event.title} className="h-32 w-full object-cover" /> : <div className="grid h-32 place-items-center bg-slate-900 text-sm font-black text-pink-200">Seattle Desi TV</div>}<div className="p-4"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{link.relationship}</p><h5 className="mt-1 line-clamp-2 font-black">{event.title}</h5><p className="mt-2 text-xs font-bold text-slate-500">{dateText(event.date)}{event.location ? ` · ${event.location}` : ""}</p></div></a>; })}</div> : <p className="mt-4 rounded-2xl bg-white p-4 font-bold text-slate-500">No upcoming linked events yet.</p>}
                {past.length > 0 && <div className="mt-5"><h4 className="font-black">Recent Past Events</h4><div className="mt-2 grid gap-2 md:grid-cols-2">{past.slice(0, 4).map((link: any) => <a key={link.id} href={`/events/${link.events.id}`} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3"><div><p className="font-black">{link.events.title}</p><p className="mt-1 text-xs text-slate-500">{dateText(link.events.date)} · {link.relationship}</p></div><span className="font-black text-pink-600">View →</span></a>)}</div></div>}
              </div>}
            </article>;
          })}
          {!loading && filtered.length === 0 && <p className="rounded-2xl bg-slate-50 p-5 font-bold text-slate-500 md:col-span-2">No approved listings found yet.</p>}
        </div>
      </section>

      <section id="submit" className="mt-8 rounded-3xl bg-white p-6 text-slate-950">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-2xl font-black">{config.addLabel}</h2><p className="mt-2 text-sm font-bold text-slate-500">Login is required to submit. Public listing is shown only after SDTV admin approval.</p></div>
          <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">{showForm ? "Hide Form" : "Open Form"}</button>
        </div>
        {showForm && (!user?.id ? <a href={`/login?next=${config.loginNext}`} className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login to Submit</a> : <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-black">Name<input value={form.name} onChange={(event) => setField("name", event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          {kind === "groups" ? <label className="grid gap-1 text-sm font-black">Platform<select value={form.platform} onChange={(event) => setField("platform", event.target.value)} className="rounded-xl border p-3 font-normal"><option>WhatsApp</option><option>Facebook</option><option>Telegram</option><option>Discord</option><option>Meetup</option><option>Other</option></select></label> : <label className="grid gap-1 text-sm font-black">Organization Type<input value={form.organization_type} onChange={(event) => setField("organization_type", event.target.value)} placeholder="Nonprofit, Temple, Association..." className="rounded-xl border p-3 font-normal" /></label>}
          <label className="grid gap-1 text-sm font-black">Category<input value={form.category} onChange={(event) => setField("category", event.target.value)} placeholder="Telugu, Tamil, Marathi, Youth, Seniors..." className="rounded-xl border p-3 font-normal" /></label>
          {kind === "groups" && <label className="grid gap-1 text-sm font-black">Language / Region<input value={form.language} onChange={(event) => setField("language", event.target.value)} className="rounded-xl border p-3 font-normal" /></label>}
          <label className="grid gap-1 text-sm font-black">Location<input value={form.location} onChange={(event) => setField("location", event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black">{config.urlLabel}<input value={kind === "groups" ? form.group_url : form.website} onChange={(event) => setField(kind === "groups" ? "group_url" : "website", event.target.value)} placeholder="https://..." className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black">Contact Name<input value={form.contact_name} onChange={(event) => setField("contact_name", event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black">Contact Email<input value={form.contact_email} onChange={(event) => setField("contact_email", event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black md:col-span-2">Description<textarea value={form.description} onChange={(event) => setField("description", event.target.value)} className="min-h-28 rounded-xl border p-3 font-normal" /></label>
          <button onClick={submit} disabled={submitting} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60 md:col-span-2">{submitting ? "Submitting..." : "Submit for Approval"}</button>
        </div>)}
      </section>
    </section>
    <SiteFooter />
  </main>;
}

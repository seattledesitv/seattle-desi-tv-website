"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { entityIdFromParam } from "../../lib/seo/urls";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }); }
function getImage(row: any) { return Array.isArray(row?.image_urls) && row.image_urls[0] ? row.image_urls[0] : row?.image || ""; }
function initials(value?: string | null) { return String(value || "SDTV").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SD"; }

export default function CommunityOrganizationProfilePage() {
  const site = useCurrentSite();
  const params = useParams();
  const organizationId = entityIdFromParam(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState<any>(null);
  const [eventLinks, setEventLinks] = useState<any[]>([]);
  const [shareMessage, setShareMessage] = useState("");

  async function load() {
    setLoading(true);
    const richColumns = "id,name,organization_type,category,location,website,description,contact_name,contact_email,contact_phone,image,image_position_x,image_position_y,image_zoom,image_display_mode,manager_verified_at";
    const basicColumns = "id,name,organization_type,category,location,website,description,contact_name,contact_email,contact_phone,image,image_position_x,image_position_y,image_zoom,image_display_mode";
    let organizationResult = await forSite(supabase.from("community_organizations").select(richColumns), site.id).eq("id", organizationId).eq("approved", true).eq("status", "approved").maybeSingle();
    if (organizationResult.error && /manager_verified_at/i.test(organizationResult.error.message || "")) organizationResult = await forSite(supabase.from("community_organizations").select(basicColumns), site.id).eq("id", organizationId).eq("approved", true).eq("status", "approved").maybeSingle();
    const linksResult = await supabase.from("event_organizations").select("id,relationship,is_primary,events(id,title,date,location,description,image,image_urls,ticket_url,status,approved)").eq("organization_id", organizationId).order("display_order");
    if (organizationResult.error || !organizationResult.data) { setMessage(organizationResult.error?.message || "Organization not found."); setLoading(false); return; }
    setOrganization(organizationResult.data);
    setEventLinks((linksResult.data || []).filter((link: any) => link.events?.approved || link.events?.status === "approved"));
    setLoading(false);
  }

  useEffect(() => { if (organizationId) void load(); }, [organizationId, site.id]);
  const today = new Date().toISOString().split("T")[0];
  const upcoming = eventLinks.filter((link) => String(link.events?.date || "") >= today).sort((a, b) => String(a.events?.date || "").localeCompare(String(b.events?.date || "")));
  const past = eventLinks.filter((link) => String(link.events?.date || "") < today).sort((a, b) => String(b.events?.date || "").localeCompare(String(a.events?.date || "")));
  const image = getImage(organization);
  const completion = useMemo(() => {
    if (!organization) return { score: 0, missing: [] as string[] };
    const checks = [["Description", organization.description], ["Image", image], ["Website", organization.website], ["Email", organization.contact_email], ["Phone", organization.contact_phone], ["Contact person", organization.contact_name], ["Category", organization.category], ["Location", organization.location]] as const;
    const complete = checks.filter(([, value]) => Boolean(String(value || "").trim())).length;
    return { score: Math.round((complete / checks.length) * 100), missing: checks.filter(([, value]) => !String(value || "").trim()).map(([label]) => label) };
  }, [organization, image]);

  async function shareProfile() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: organization?.name || "SDTV Organization", text: `View ${organization?.name || "this organization"} on Seattle Desi TV.`, url });
      else { await navigator.clipboard.writeText(url); setShareMessage("Profile link copied."); setTimeout(() => setShareMessage(""), 2500); }
    } catch { /* User cancelled or sharing is unavailable. */ }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />{loading ? <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">Loading organization...</div></section> : !organization ? <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">{message}</div></section> : <>
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {image && <><img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl" /><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-pink-950/75" /></>}
      <div className="relative mx-auto grid max-w-6xl gap-8 px-6 py-12 md:px-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div><a href="/community-organizations" className="font-bold text-pink-300">← Back to Organizations</a><div className="mt-7 flex flex-wrap items-center gap-2"><p className="text-sm font-black uppercase tracking-[0.2em] text-pink-300">Community Organization</p>{organization.manager_verified_at && <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-200 ring-1 ring-emerald-300/30">✓ Verified Manager</span>}</div><h1 className="mt-3 text-4xl font-black md:text-6xl">{organization.name}</h1><div className="mt-5 flex flex-wrap gap-2">{organization.organization_type && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.organization_type}</span>}{organization.category && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.category}</span>}{organization.location && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.location}</span>}</div><div className="mt-7 flex flex-wrap gap-3">{organization.website && <CheckedExternalLink href={organization.website} notFoundMessage="This organization website is not available." className="inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Visit Website</CheckedExternalLink>}<a href={`/community-organizations/manage?organization=${organization.id}`} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Manage this Organization</a><button type="button" onClick={shareProfile} className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-black">Share</button></div>{shareMessage && <p className="mt-3 text-sm font-bold text-emerald-200">{shareMessage}</p>}</div>
        <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/10 shadow-2xl">{image ? <div className="relative aspect-[4/3] overflow-hidden bg-white"><img src={image} alt={organization.name} className={organization.image_display_mode === "contain" || organization.image_display_mode === "blur" ? "h-full w-full object-contain p-4" : "h-full w-full object-cover"} style={organization.image_display_mode === "cover" || !organization.image_display_mode ? { objectPosition: `${organization.image_position_x ?? 50}% ${organization.image_position_y ?? 50}%`, transform: `scale(${organization.image_zoom ?? 1})`, transformOrigin: `${organization.image_position_x ?? 50}% ${organization.image_position_y ?? 50}%` } : undefined} /></div> : <div className="grid aspect-[4/3] place-items-center bg-gradient-to-br from-white to-slate-200 text-slate-950"><div className="text-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-pink-600 text-4xl font-black text-white">{initials(organization.name)}</div><p className="mt-4 font-black text-slate-500">Organization image coming soon</p></div></div>}</div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-6 py-10 md:px-10"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"><div><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">About</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{organization.description || "No description provided yet."}</p></section><section className="mt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-wide text-pink-600">Connected Events</p><h2 className="mt-1 text-3xl font-black">Upcoming Events</h2></div><a href="/events" className="font-black text-pink-600">View all events</a></div><div className="mt-5 grid gap-4 md:grid-cols-2">{upcoming.map((link) => { const event = link.events; const eventImage = getImage(event); return <a key={link.id} href={`/events/${event.id}`} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-lg">{eventImage ? <img src={eventImage} alt={event.title} className="h-48 w-full object-cover" /> : <div className="grid h-48 place-items-center bg-slate-900 font-black text-pink-200">Seattle Desi TV</div>}<div className="p-5"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{link.relationship}</p><h3 className="mt-2 text-xl font-black">{event.title}</h3><p className="mt-2 text-sm font-bold text-slate-500">{dateText(event.date)} · {event.location}</p></div></a>; })}{upcoming.length === 0 && <div className="rounded-2xl border bg-white p-6 font-bold text-slate-500 md:col-span-2">No upcoming linked events yet.</div>}</div></section>{past.length > 0 && <section className="mt-10"><h2 className="text-2xl font-black">Past Events</h2><div className="mt-4 space-y-3">{past.slice(0, 6).map((link) => <a key={link.id} href={`/events/${link.events.id}`} className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4"><div><p className="font-black">{link.events.title}</p><p className="mt-1 text-sm text-slate-500">{dateText(link.events.date)} · {link.relationship}</p></div><span className="font-black text-pink-600">View →</span></a>)}</div></section>}</div><aside className="space-y-5"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Organization Details</h2><div className="mt-4 space-y-4 text-sm"><div><p className="font-black uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-bold">{organization.location || "Seattle Area"}</p></div><div><p className="font-black uppercase tracking-wide text-slate-400">Category</p><p className="mt-1 font-bold">{organization.category || "Community"}</p></div>{organization.contact_name && <div><p className="font-black uppercase tracking-wide text-slate-400">Contact</p><p className="mt-1 font-bold">{organization.contact_name}</p></div>}{organization.contact_email && <a href={`mailto:${organization.contact_email}`} className="block rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Email Organization</a>}{organization.contact_phone && <a href={`tel:${organization.contact_phone}`} className="block rounded-xl border px-4 py-3 text-center font-black">Call Organization</a>}</div></div><div className="rounded-3xl border bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Profile Health</h2><span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-black text-pink-700">{completion.score}%</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-pink-600" style={{ width: `${completion.score}%` }} /></div>{completion.missing.length > 0 ? <><p className="mt-4 text-sm font-bold text-slate-600">Help improve this profile by adding:</p><p className="mt-2 text-sm text-slate-500">{completion.missing.join(", ")}</p></> : <p className="mt-4 text-sm font-bold text-emerald-700">This profile has all core information.</p>}<div className="mt-5 grid gap-2"><a href={`/community-organizations/manage?organization=${organization.id}`} className="rounded-xl bg-pink-600 px-4 py-3 text-center font-black text-white">Manage this Organization</a><a href={`/community-organizations/suggest-update?organization=${organization.id}`} className="rounded-xl border px-4 py-3 text-center font-black">Suggest an Update</a></div></div><div className="rounded-3xl border bg-white p-6 text-center shadow-sm"><p className="text-sm font-black uppercase tracking-wide text-pink-600">SDTV Community Network</p><p className="mt-3 text-sm leading-6 text-slate-600">This public profile brings together verified organization details and its connected SDTV event history.</p></div></aside></div></section>
  </>}<SiteFooter /></main>;
}

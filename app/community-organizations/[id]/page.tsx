"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import CheckedExternalLink from "../../components/CheckedExternalLink";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
function dateText(value?: string) { if (!value) return ""; const d = new Date(`${String(value).split("T")[0]}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }); }
function getImage(event: any) { return Array.isArray(event?.image_urls) && event.image_urls[0] ? event.image_urls[0] : event?.image || ""; }

export default function CommunityOrganizationProfilePage() {
  const params = useParams();
  const organizationId = String(Array.isArray(params?.id) ? params.id[0] : params?.id || "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState<any>(null);
  const [eventLinks, setEventLinks] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const [organizationResult, linksResult] = await Promise.all([
      supabase.from("community_organizations").select("id,name,organization_type,category,location,website,description,contact_name,contact_email,contact_phone").eq("id", organizationId).eq("approved", true).eq("status", "approved").maybeSingle(),
      supabase.from("event_organizations").select("id,relationship,is_primary,events(id,title,date,location,description,image,image_urls,ticket_url,status,approved)").eq("organization_id", organizationId).order("display_order")
    ]);
    if (organizationResult.error || !organizationResult.data) { setMessage(organizationResult.error?.message || "Organization not found."); setLoading(false); return; }
    setOrganization(organizationResult.data);
    setEventLinks((linksResult.data || []).filter((link: any) => link.events?.approved || link.events?.status === "approved"));
    setLoading(false);
  }

  useEffect(() => { if (organizationId) load(); }, [organizationId]);
  const today = new Date().toISOString().split("T")[0];
  const upcoming = eventLinks.filter((link) => String(link.events?.date || "") >= today).sort((a, b) => String(a.events?.date || "").localeCompare(String(b.events?.date || "")));
  const past = eventLinks.filter((link) => String(link.events?.date || "") < today).sort((a, b) => String(b.events?.date || "").localeCompare(String(a.events?.date || "")));

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />{loading ? <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">Loading organization...</div></section> : !organization ? <section className="mx-auto max-w-5xl px-6 py-16"><div className="rounded-2xl border bg-white p-8">{message}</div></section> : <>
    <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 text-white"><div className="mx-auto max-w-6xl px-6 py-14 md:px-10"><a href="/community-organizations" className="font-bold text-pink-300">← Back to Organizations</a><p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-pink-300">Community Organization</p><h1 className="mt-3 text-4xl font-black md:text-6xl">{organization.name}</h1><div className="mt-5 flex flex-wrap gap-2">{organization.organization_type && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.organization_type}</span>}{organization.category && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.category}</span>}{organization.location && <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">{organization.location}</span>}</div>{organization.website && <CheckedExternalLink href={organization.website} notFoundMessage="This organization website is not available." className="mt-7 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Visit Website</CheckedExternalLink>}</div></section>
    <section className="mx-auto max-w-6xl px-6 py-10 md:px-10"><div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"><div><section className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">About</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{organization.description || "No description provided."}</p></section><section className="mt-8"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-wide text-pink-600">Connected Events</p><h2 className="mt-1 text-3xl font-black">Upcoming Events</h2></div><a href="/events" className="font-black text-pink-600">View all events</a></div><div className="mt-5 grid gap-4 md:grid-cols-2">{upcoming.map((link) => { const event = link.events; const image = getImage(event); return <a key={link.id} href={`/events/${event.id}`} className="overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-1 hover:shadow-lg">{image ? <img src={image} alt={event.title} className="h-48 w-full object-cover" /> : <div className="grid h-48 place-items-center bg-slate-900 font-black text-pink-200">Seattle Desi TV</div>}<div className="p-5"><p className="text-xs font-black uppercase tracking-wide text-pink-600">{link.relationship}</p><h3 className="mt-2 text-xl font-black">{event.title}</h3><p className="mt-2 text-sm font-bold text-slate-500">{dateText(event.date)} · {event.location}</p></div></a>; })}{upcoming.length === 0 && <div className="rounded-2xl border bg-white p-6 font-bold text-slate-500 md:col-span-2">No upcoming linked events yet.</div>}</div></section>{past.length > 0 && <section className="mt-10"><h2 className="text-2xl font-black">Past Events</h2><div className="mt-4 space-y-3">{past.slice(0, 6).map((link) => <a key={link.id} href={`/events/${link.events.id}`} className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4"><div><p className="font-black">{link.events.title}</p><p className="mt-1 text-sm text-slate-500">{dateText(link.events.date)} · {link.relationship}</p></div><span className="font-black text-pink-600">View →</span></a>)}</div></section>}</div><aside className="space-y-5"><div className="rounded-3xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Organization Details</h2><div className="mt-4 space-y-4 text-sm"><div><p className="font-black uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-bold">{organization.location || "Seattle Area"}</p></div><div><p className="font-black uppercase tracking-wide text-slate-400">Category</p><p className="mt-1 font-bold">{organization.category || "Community"}</p></div>{organization.contact_name && <div><p className="font-black uppercase tracking-wide text-slate-400">Contact</p><p className="mt-1 font-bold">{organization.contact_name}</p></div>}{organization.contact_email && <a href={`mailto:${organization.contact_email}`} className="block rounded-xl bg-slate-950 px-4 py-3 text-center font-black text-white">Email Organization</a>}</div></div><div className="rounded-3xl border bg-white p-6 text-center shadow-sm"><p className="text-sm font-black uppercase tracking-wide text-pink-600">SDTV Community Network</p><p className="mt-3 text-sm leading-6 text-slate-600">This profile connects the organization with the events it organizes, co-hosts, sponsors, or supports.</p></div></aside></div></section>
  </>}<SiteFooter /></main>;
}

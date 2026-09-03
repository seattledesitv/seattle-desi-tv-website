"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();
const emptyType = { name: "General Admission", description: "", price: "", quantity: "100", min: "1", max: "10" };

function money(cents: number, currency = "USD") { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(cents || 0) / 100); }
function when(value?: string | null) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }

export default function OrganizationTicketingPage() {
  const site = useCurrentSite();
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("Loading ticketing workspace...");
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ salesStart: "", salesEnd: "", capacity: "", maxPerOrder: "10", refundPolicy: "", terms: "" });
  const [ticketType, setTicketType] = useState(emptyType);

  async function load() {
    const auth = await supabase.auth.getUser(); const currentUser = auth.data.user || null; setUser(currentUser);
    if (!currentUser) { setMessage("Please sign in to configure organization ticket sales."); return; }
    const managers = await forSite(supabase.from("organization_managers").select("organization_id,role,community_organizations(id,name,status)").eq("user_id", currentUser.id).eq("active", true), site.id);
    if (managers.error) { setMessage(managers.error.message); return; }
    const orgs = (managers.data || []).map((row: any) => ({ ...row.community_organizations, manager_role: row.role })).filter((row: any) => row?.id);
    setOrganizations(orgs); const ids = orgs.map((row: any) => row.id);
    setOrganizationId((current) => ids.includes(current) ? current : ids[0] || "");
    if (!ids.length) { setMessage("No verified organization-management access was found for your account."); return; }
    const [links, accountRows, settingRows] = await Promise.all([
      forSite(supabase.from("event_organizations").select("organization_id,relationship,events(id,title,date,location,status,approved)").in("organization_id", ids), site.id),
      forSite(supabase.from("organization_payment_accounts").select("*").in("organization_id", ids), site.id),
      forSite(supabase.from("event_ticket_settings").select("*").in("organization_id", ids), site.id),
    ]);
    if (links.error || accountRows.error || settingRows.error) { setMessage(links.error?.message || accountRows.error?.message || settingRows.error?.message || "Ticketing tables are not ready. Run the ticketing SQL migration first."); return; }
    const eventRows = (links.data || []).map((row: any) => ({ ...row.events, organization_id: row.organization_id, relationship: row.relationship })).filter((row: any) => row?.id && (row.approved || row.status === "approved"));
    setEvents(eventRows); setEventId((current) => eventRows.some((row: any) => row.id === current) ? current : eventRows[0]?.id || ""); setAccounts(accountRows.data || []); setSettings(settingRows.data || []);
    const settingIds = (settingRows.data || []).map((row: any) => row.id);
    if (settingIds.length) { const typeRows = await forSite(supabase.from("event_ticket_types").select("*").in("ticket_setting_id", settingIds).order("display_order"), site.id); if (!typeRows.error) setTypes(typeRows.data || []); }
    setMessage("Configure ticket inventory now. Swirepay organizer onboarding will connect here when its routing fields are confirmed.");
  }

  useEffect(() => { void load(); }, [site.id]);
  const selectedOrganization = organizations.find((row) => row.id === organizationId) || null;
  const visibleEvents = useMemo(() => events.filter((row) => row.organization_id === organizationId), [events, organizationId]);
  const selectedEvent = visibleEvents.find((row) => row.id === eventId) || visibleEvents[0] || null;
  const selectedSetting = settings.find((row) => row.event_id === selectedEvent?.id) || null;
  const selectedAccount = accounts.find((row) => row.organization_id === organizationId) || null;
  const selectedTypes = types.filter((row) => row.ticket_setting_id === selectedSetting?.id);

  useEffect(() => { if (!selectedEvent && visibleEvents[0]) setEventId(visibleEvents[0].id); }, [organizationId, visibleEvents.length]);
  useEffect(() => { if (!selectedSetting) { setConfig({ salesStart: "", salesEnd: "", capacity: "", maxPerOrder: "10", refundPolicy: "", terms: "" }); return; } setConfig({ salesStart: selectedSetting.sales_start_at?.slice(0,16) || "", salesEnd: selectedSetting.sales_end_at?.slice(0,16) || "", capacity: selectedSetting.venue_capacity ? String(selectedSetting.venue_capacity) : "", maxPerOrder: String(selectedSetting.max_tickets_per_order || 10), refundPolicy: selectedSetting.refund_policy || "", terms: selectedSetting.terms || "" }); }, [selectedSetting?.id]);

  async function saveConfiguration(submit = false) {
    if (!user || !selectedOrganization || !selectedEvent) return; setSaving(true); setMessage("");
    const payload = { site_id: site.id, event_id: selectedEvent.id, organization_id: selectedOrganization.id, status: submit ? "pending_review" : selectedSetting?.status === "active" ? "paused" : "draft", currency: "USD", sales_start_at: config.salesStart ? new Date(config.salesStart).toISOString() : null, sales_end_at: config.salesEnd ? new Date(config.salesEnd).toISOString() : null, venue_capacity: config.capacity ? Number(config.capacity) : null, max_tickets_per_order: Number(config.maxPerOrder || 10), refund_policy: config.refundPolicy.trim() || null, terms: config.terms.trim() || null, created_by: selectedSetting?.created_by || user.id, updated_at: new Date().toISOString() };
    const result = await supabase.from("event_ticket_settings").upsert(payload, { onConflict: "site_id,event_id" }); setSaving(false);
    if (result.error) { setMessage(result.error.message); return; } setMessage(submit ? "Ticket sales configuration submitted for Studio review." : "Draft ticket configuration saved."); await load();
  }

  async function addTicketType() {
    if (!selectedSetting) { setMessage("Save the event ticket configuration before adding ticket types."); return; }
    const price = Math.round(Number(ticketType.price || 0) * 100), quantity = Number(ticketType.quantity), min = Number(ticketType.min), max = Number(ticketType.max);
    if (!ticketType.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1 || min < 1 || max < min) { setMessage("Enter a valid name, price, inventory quantity, and order limits."); return; }
    setSaving(true); const result = await supabase.from("event_ticket_types").insert({ site_id: site.id, ticket_setting_id: selectedSetting.id, event_id: selectedSetting.event_id, name: ticketType.name.trim(), description: ticketType.description.trim() || null, price_cents: price, quantity_total: quantity, min_per_order: min, max_per_order: max, display_order: selectedTypes.length }); setSaving(false);
    if (result.error) { setMessage(result.error.message); return; } setTicketType(emptyType); setMessage("Ticket type added."); await load();
  }

  async function toggleType(row: any) { const status = row.status === "active" ? "hidden" : "active"; const result = await forSite(supabase.from("event_ticket_types").update({ status, updated_at: new Date().toISOString() }), site.id).eq("id", row.id); if (result.error) setMessage(result.error.message); else await load(); }
  async function removeType(row: any) { if (row.quantity_sold > 0 || !window.confirm(`Delete ${row.name}?`)) return; const result = await forSite(supabase.from("event_ticket_types").delete(), site.id).eq("id", row.id); if (result.error) setMessage(result.error.message); else await load(); }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader/><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">Organization tools</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Event Ticketing</h1><p className="mt-2 max-w-3xl text-slate-300">Set up inventory and submit ticket sales for approval. Payment activation remains controlled by SDTV and Swirepay verification.</p></div><a href="/my-organizations" className="rounded-xl bg-white px-5 py-3 text-center font-black text-slate-950">Back to My Organizations</a></div>
    {message && <div className="mt-6 rounded-2xl bg-amber-100 p-4 font-bold text-amber-950">{message}</div>}
    {!user ? <a href="/login?next=/my-organizations/ticketing" className="mt-6 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black">Sign in</a> : organizations.length > 0 && <div className="mt-8 grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="h-fit rounded-3xl bg-white p-5 text-slate-950"><label className="text-sm font-black">Organization<select className="mt-2 w-full rounded-xl border p-3" value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setEventId(""); }}><option value="">Select</option>{organizations.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><div className="mt-5 rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Swirepay payout registration</p><p className="mt-2 text-xl font-black capitalize">{String(selectedAccount?.onboarding_status || "not started").replaceAll("_", " ")}</p><div className="mt-3 flex gap-2 text-xs font-black"><span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Payments collected by SDTV</span><span className={`rounded-full px-2 py-1 ${selectedAccount?.payouts_enabled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>Organizer payouts {selectedAccount?.payouts_enabled ? "ready" : "pending"}</span></div><button disabled className="mt-4 w-full rounded-xl bg-slate-300 px-4 py-3 font-black text-slate-600">Register Payout Account — SDK pending</button></div><div className="mt-5 grid gap-2">{visibleEvents.map((row) => <button key={row.id} onClick={() => setEventId(row.id)} className={`rounded-xl border p-3 text-left ${selectedEvent?.id === row.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}><p className="font-black">{row.title}</p><p className="mt-1 text-xs text-slate-500">{row.date} · {row.relationship}</p></button>)}{visibleEvents.length === 0 && <p className="rounded-xl bg-slate-100 p-4 text-sm font-bold text-slate-500">No approved linked events found.</p>}</div></aside>
      <section className="rounded-[2rem] bg-white p-6 text-slate-950">{!selectedEvent ? <p className="font-bold text-slate-500">Choose an organization with an approved linked event.</p> : <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-pink-600">Ticket configuration</p><h2 className="mt-1 text-3xl font-black">{selectedEvent.title}</h2><p className="mt-2 text-slate-500">{selectedEvent.date} · {selectedEvent.location}</p></div><span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black capitalize">{String(selectedSetting?.status || "not configured").replaceAll("_", " ")}</span></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="font-black">Sales start<input type="datetime-local" value={config.salesStart} onChange={(e) => setConfig({...config,salesStart:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-black">Sales end<input type="datetime-local" value={config.salesEnd} onChange={(e) => setConfig({...config,salesEnd:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-black">Venue capacity<input type="number" min="1" value={config.capacity} onChange={(e) => setConfig({...config,capacity:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="Optional"/></label><label className="font-black">Maximum tickets per order<input type="number" min="1" max="50" value={config.maxPerOrder} onChange={(e) => setConfig({...config,maxPerOrder:e.target.value})} className="mt-1 w-full rounded-xl border p-3 font-normal"/></label><label className="font-black md:col-span-2">Refund policy<textarea value={config.refundPolicy} onChange={(e) => setConfig({...config,refundPolicy:e.target.value})} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"/></label><label className="font-black md:col-span-2">Ticket terms<textarea value={config.terms} onChange={(e) => setConfig({...config,terms:e.target.value})} className="mt-1 min-h-24 w-full rounded-xl border p-3 font-normal"/></label></div><div className="mt-5 flex flex-wrap gap-3"><button disabled={saving} onClick={() => saveConfiguration(false)} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Save Draft</button><button disabled={saving || !selectedSetting || selectedTypes.length === 0} onClick={() => saveConfiguration(true)} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-40">Submit for Approval</button></div>
        <section className="mt-8 border-t pt-7"><h3 className="text-2xl font-black">Ticket Types</h3><div className="mt-4 grid gap-3">{selectedTypes.map((row) => <div key={row.id} className="flex flex-col justify-between gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center"><div><p className="font-black">{row.name} · {money(row.price_cents, selectedSetting?.currency)}</p><p className="mt-1 text-sm text-slate-500">{row.quantity_sold} sold · {row.quantity_reserved} reserved · {row.quantity_total - row.quantity_sold - row.quantity_reserved} available · {row.status}</p></div><div className="flex gap-2"><button onClick={() => toggleType(row)} className="rounded-lg border px-3 py-2 text-sm font-black">{row.status === "active" ? "Hide" : "Show"}</button><button disabled={row.quantity_sold > 0} onClick={() => removeType(row)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-black text-red-600 disabled:opacity-40">Delete</button></div></div>)}</div>{selectedSetting && <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3"><input value={ticketType.name} onChange={(e) => setTicketType({...ticketType,name:e.target.value})} placeholder="Ticket name" className="rounded-xl border p-3 font-bold"/><input type="number" min="0" step="0.01" value={ticketType.price} onChange={(e) => setTicketType({...ticketType,price:e.target.value})} placeholder="Price in USD" className="rounded-xl border p-3"/><input type="number" min="1" value={ticketType.quantity} onChange={(e) => setTicketType({...ticketType,quantity:e.target.value})} placeholder="Quantity" className="rounded-xl border p-3"/><input value={ticketType.description} onChange={(e) => setTicketType({...ticketType,description:e.target.value})} placeholder="Description (optional)" className="rounded-xl border p-3 md:col-span-3"/><input type="number" min="1" value={ticketType.min} onChange={(e) => setTicketType({...ticketType,min:e.target.value})} placeholder="Minimum/order" className="rounded-xl border p-3"/><input type="number" min="1" max="50" value={ticketType.max} onChange={(e) => setTicketType({...ticketType,max:e.target.value})} placeholder="Maximum/order" className="rounded-xl border p-3"/><button disabled={saving} onClick={addTicketType} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white">Add Ticket Type</button></div>}</section>
        {selectedSetting && <p className="mt-6 text-xs font-bold text-slate-400">Last updated: {when(selectedSetting.updated_at)}</p>}</>}</section>
    </div>}
  </section><SiteFooter/></main>;
}

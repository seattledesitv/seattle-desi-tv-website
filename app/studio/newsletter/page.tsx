"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import NewsletterPreview from "../../components/NewsletterPreview";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { generateNewsletterDraft } from "../../lib/newsletterGenerator";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const defaultSections = [
  { section_key: "intro", display_order: 1, enabled: true, title: "Opening Note", max_items: 1 },
  { section_key: "events", display_order: 2, enabled: true, title: "Upcoming Events", max_items: 5 },
  { section_key: "tv", display_order: 3, enabled: true, title: "Latest TV", max_items: 4 },
  { section_key: "instagram", display_order: 4, enabled: true, title: "Latest Instagram", max_items: 4 },
  { section_key: "businesses", display_order: 5, enabled: true, title: "Local Business Spotlight", max_items: 3 },
  { section_key: "groups", display_order: 6, enabled: true, title: "Community Groups", max_items: 4 },
  { section_key: "organizations", display_order: 7, enabled: true, title: "Community Organizations", max_items: 4 },
  { section_key: "closing", display_order: 8, enabled: true, title: "Stay Connected", max_items: 1 },
];

function numberValue(value: any, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function fmt(value: any) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }

export default function StudioNewsletterPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading newsletter dashboard...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>(defaultSections);
  const [draft, setDraft] = useState<any>(null);
  const [campaignId, setCampaignId] = useState("");
  const [previewEmail, setPreviewEmail] = useState("");

  const canAccess = Boolean(user && isAdminRole(role));
  const stats = useMemo(() => ({ total: subscribers.length, active: subscribers.filter((row) => row.status === "active").length, pending: subscribers.filter((row) => row.status === "pending").length, unsubscribed: subscribers.filter((row) => row.status === "unsubscribed").length }), [subscribers]);

  async function loadContent() {
    const [subscriberResult, settingsResult, campaignsResult] = await Promise.all([
      supabase.from("newsletter_subscribers").select("id,email,name,status,source_page,subscribed_at,created_at").order("subscribed_at", { ascending: false }).limit(200),
      supabase.from("newsletter_settings").select("section_key,display_order,enabled,title,max_items").order("display_order", { ascending: true }),
      supabase.from("newsletter_campaigns").select("id,subject,preheader,status,created_by_email,test_sent_to,test_sent_at,sent_at,created_at,updated_at,draft_json").order("updated_at", { ascending: false }).limit(25),
    ]);
    if (!subscriberResult.error && Array.isArray(subscriberResult.data)) setSubscribers(subscriberResult.data);
    if (!campaignsResult.error && Array.isArray(campaignsResult.data)) setCampaigns(campaignsResult.data);
    if (!settingsResult.error && Array.isArray(settingsResult.data) && settingsResult.data.length > 0) {
      const existing = settingsResult.data;
      const missing = defaultSections.filter((item) => !existing.some((row: any) => row.section_key === item.section_key));
      setSections([...existing, ...missing].sort((a: any, b: any) => numberValue(a.display_order, 999) - numberValue(b.display_order, 999)));
    } else setSections(defaultSections);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    setPreviewEmail(currentUser?.email || "");
    if (!currentUser) { setMessage("Please login to manage newsletters."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Newsletter management requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadContent(); setMessage(""); setLoading(false);
  }

  async function saveSettings() {
    setActionMessage("Saving newsletter control...");
    const payload = sections.map((section, index) => ({ section_key: section.section_key, display_order: numberValue(section.display_order, index + 1), enabled: section.enabled !== false, title: section.title || null, max_items: Math.max(1, numberValue(section.max_items, 4)) }));
    const { error } = await supabase.from("newsletter_settings").upsert(payload, { onConflict: "section_key" });
    if (error) { setActionMessage(`Could not save newsletter control: ${error.message}`); return; }
    setActionMessage("Newsletter control saved."); await loadContent();
  }

  async function seedDefaults() {
    setActionMessage("Creating default newsletter control...");
    const { error } = await supabase.from("newsletter_settings").upsert(defaultSections, { onConflict: "section_key" });
    if (error) setActionMessage(`Could not seed defaults: ${error.message}`); else { setActionMessage("Default newsletter control created."); await loadContent(); }
  }

  function updateSection(index: number, field: string, value: any) { setSections((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item)); }
  function moveSection(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= sections.length) return; const next = [...sections]; [next[index], next[target]] = [next[target], next[index]]; setSections(next.map((item, itemIndex) => ({ ...item, display_order: itemIndex + 1 }))); }

  async function generateDraft() {
    setActionMessage("Generating newsletter from latest SDTV content...");
    const nextDraft = await generateNewsletterDraft(sections);
    setDraft(nextDraft); setCampaignId("");
    setActionMessage("Newsletter generated from latest content. Save it before sending a preview or reusing later.");
  }

  async function saveDraft() {
    if (!draft) { setActionMessage("Generate a newsletter first."); return; }
    setActionMessage("Saving newsletter...");
    const payload = { subject: draft.subject || "Seattle Desi TV Community Update", preheader: draft.preheader || "", status: "draft", draft_json: draft, created_by: user?.id || null, created_by_email: user?.email || null, updated_at: new Date().toISOString() } as any;
    const request = campaignId ? supabase.from("newsletter_campaigns").update(payload).eq("id", campaignId).select("id").single() : supabase.from("newsletter_campaigns").insert(payload).select("id").single();
    const { data, error } = await request;
    if (error) { setActionMessage(`Could not save newsletter: ${error.message}`); return; }
    setCampaignId(data?.id || campaignId);
    setActionMessage("Newsletter saved.");
    await loadContent();
  }

  async function sendPreview() {
    if (!draft) { setActionMessage("Generate or load a newsletter first."); return; }
    if (!previewEmail.includes("@")) { setActionMessage("Enter a valid preview email."); return; }
    setActionMessage("Sending preview email...");
    const response = await fetch("/api/newsletter/send-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: previewEmail, draft }) });
    const result = await response.json();
    if (!result?.ok) { setActionMessage(result?.error || "Could not send preview email."); return; }
    if (campaignId) await supabase.from("newsletter_campaigns").update({ status: "test_sent", test_sent_to: previewEmail, test_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", campaignId);
    setActionMessage("Preview email sent."); await loadContent();
  }

  function loadCampaign(campaign: any) { setDraft(campaign.draft_json); setCampaignId(campaign.id); setActionMessage("Newsletter loaded for editing or resend preview."); }
  function duplicateCampaign(campaign: any) { setDraft({ ...campaign.draft_json, subject: `${campaign.subject} Copy` }); setCampaignId(""); setActionMessage("Newsletter duplicated. Save it as a new draft."); }
  function updateDraftSection(index: number, field: string, value: any) { setDraft((current: any) => ({ ...current, sections: current.sections.map((item: any, i: number) => i === index ? { ...item, [field]: value } : item) })); }
  function removeDraftSection(index: number) { setDraft((current: any) => ({ ...current, sections: current.sections.filter((_: any, i: number) => i !== index) })); }
  function addCustomSection() { const custom = { id: `custom-${Date.now()}`, title: "New Section", body: "Add your message here.", items: [] }; setDraft((current: any) => current ? { ...current, sections: [...current.sections, custom] } : { subject: "Seattle Desi TV Community Update", preheader: "", sections: [custom] }); }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Newsletter Studio</h1><p className="text-slate-300 mt-2">Generate, save, preview, and reuse SDTV newsletters.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}</div><div className="flex flex-wrap gap-3"><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button><button onClick={generateDraft} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">Generate Newsletter</button><button onClick={addCustomSection} className="bg-yellow-300 text-slate-950 px-5 py-3 rounded-xl font-bold">Add Section</button></div></div>
      {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-8">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}
        <section className="grid gap-4 md:grid-cols-4">{[["Total", stats.total], ["Active", stats.active], ["Pending", stats.pending], ["Unsubscribed", stats.unsubscribed]].map(([label, value]) => <div key={label as string} className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl"><p className="text-sm font-black text-slate-500">{label}</p><p className="mt-2 text-4xl font-black text-pink-600">{value as number}</p></div>)}</section>
        <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5"><div><h2 className="text-2xl font-black">Newsletter Control</h2><p className="text-gray-600 text-sm mt-1">Independent from homepage order. Enable, reorder, rename, and set item limits.</p></div><div className="flex gap-3"><button onClick={seedDefaults} className="border px-4 py-2 rounded-xl font-bold">Seed Defaults</button><button onClick={saveSettings} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Save Control</button></div></div><div className="grid gap-4">{sections.map((section, index) => <article key={section.section_key} className="border rounded-2xl p-4 grid lg:grid-cols-[160px_120px_1fr_120px_auto] gap-3 items-center"><div><p className="font-black">{section.section_key}</p><p className="text-xs text-gray-500">Order {section.display_order}</p></div><label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={section.enabled !== false} onChange={(event) => updateSection(index, "enabled", event.target.checked)} /> Enabled</label><input className="border rounded-lg p-3" placeholder="Title" value={section.title || ""} onChange={(event) => updateSection(index, "title", event.target.value)} /><input className="border rounded-lg p-3" type="number" min="1" max="20" value={section.max_items || 1} onChange={(event) => updateSection(index, "max_items", event.target.value)} /><div className="flex gap-2 justify-end"><button onClick={() => moveSection(index, -1)} className="border px-3 py-2 rounded-lg font-bold">Up</button><button onClick={() => moveSection(index, 1)} className="border px-3 py-2 rounded-lg font-bold">Down</button></div></article>)}</div></section>
        {draft && <section className="grid gap-6 xl:grid-cols-[420px_1fr]"><div className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl h-fit"><h2 className="text-2xl font-black">Edit Newsletter</h2><p className="text-gray-600 text-sm mt-1">Save drafts, send preview emails, and edit sections.</p><input className="mt-5 w-full border rounded-xl p-3 font-bold" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} /><input className="mt-3 w-full border rounded-xl p-3" value={draft.preheader} onChange={(event) => setDraft({ ...draft, preheader: event.target.value })} /><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input className="border rounded-xl p-3" placeholder="Preview email" value={previewEmail} onChange={(e) => setPreviewEmail(e.target.value)} /><button onClick={saveDraft} className="bg-slate-950 text-white px-4 py-3 rounded-xl font-black">Save</button><button onClick={sendPreview} className="bg-pink-600 text-white px-4 py-3 rounded-xl font-black">Send Preview</button></div><div className="mt-5 grid gap-4">{draft.sections.map((section: any, index: number) => <div key={section.id} className="rounded-2xl border p-4"><div className="flex items-center gap-2"><input className="w-full font-black border rounded-xl p-2" value={section.title} onChange={(event) => updateDraftSection(index, "title", event.target.value)} /><button onClick={() => removeDraftSection(index)} className="text-red-600 font-black text-sm">Remove</button></div><textarea className="mt-2 w-full border rounded-xl p-3" rows={3} value={section.body} onChange={(event) => updateDraftSection(index, "body", event.target.value)} /><p className="mt-2 text-xs font-bold text-gray-500">{section.items.length} generated item(s)</p></div>)}</div></div><NewsletterPreview draft={draft} /></section>}
        <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl"><h2 className="text-2xl font-black mb-4">Saved Newsletters</h2><div className="grid gap-3">{campaigns.map((campaign) => <article key={campaign.id} className="rounded-2xl border p-4 grid gap-3 lg:grid-cols-[1fr_140px_160px_auto] lg:items-center"><div><p className="font-black">{campaign.subject}</p><p className="text-xs text-gray-500">Updated {fmt(campaign.updated_at)} · Test sent: {campaign.test_sent_to || "—"}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-center text-xs font-black uppercase">{campaign.status}</span><p className="text-sm text-gray-600">{fmt(campaign.created_at)}</p><div className="flex gap-2 justify-end"><button onClick={() => loadCampaign(campaign)} className="border px-3 py-2 rounded-lg font-bold">Open</button><button onClick={() => duplicateCampaign(campaign)} className="border px-3 py-2 rounded-lg font-bold">Duplicate</button></div></article>)}{campaigns.length === 0 && <p className="text-gray-600">No saved newsletters yet.</p>}</div></section>
        <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl"><h2 className="text-2xl font-black mb-4">Recent Subscribers</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-3">Email</th><th>Name</th><th>Status</th><th>Source</th><th>Subscribed</th></tr></thead><tbody>{subscribers.slice(0, 50).map((subscriber) => <tr key={subscriber.id || subscriber.email} className="border-b"><td className="py-3 font-bold">{subscriber.email}</td><td>{subscriber.name || "—"}</td><td>{subscriber.status || "active"}</td><td>{subscriber.source_page || "—"}</td><td>{subscriber.subscribed_at ? new Date(subscriber.subscribed_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div></section></div>}</div></main>
  );
}

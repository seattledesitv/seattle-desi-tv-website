"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const defaultSections = [
  { section_key: "intro", display_order: 1, enabled: true, title: "Opening Note", max_items: 1 },
  { section_key: "events", display_order: 2, enabled: true, title: "Upcoming Events", max_items: 5 },
  { section_key: "tv", display_order: 3, enabled: true, title: "Latest TV", max_items: 4 },
  { section_key: "playlists", display_order: 4, enabled: true, title: "Featured Series", max_items: 2 },
  { section_key: "instagram", display_order: 5, enabled: true, title: "Latest Instagram", max_items: 4 },
  { section_key: "radio", display_order: 6, enabled: true, title: "Radio Highlights", max_items: 3 },
  { section_key: "businesses", display_order: 7, enabled: true, title: "Local Business Spotlight", max_items: 3 },
  { section_key: "community", display_order: 8, enabled: true, title: "Community Updates", max_items: 5 },
  { section_key: "groups", display_order: 9, enabled: true, title: "Community Groups", max_items: 4 },
  { section_key: "organizations", display_order: 10, enabled: true, title: "Community Organizations", max_items: 4 },
  { section_key: "closing", display_order: 11, enabled: true, title: "Stay Connected", max_items: 1 },
];

function numberValue(value: any, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function StudioNewsletterPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading newsletter dashboard...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>(defaultSections);
  const [draft, setDraft] = useState<any>(null);

  const canAccess = Boolean(user && isAdminRole(role));

  const stats = useMemo(() => {
    const active = subscribers.filter((row) => row.status === "active").length;
    const unsubscribed = subscribers.filter((row) => row.status === "unsubscribed").length;
    const pending = subscribers.filter((row) => row.status === "pending").length;
    return { total: subscribers.length, active, pending, unsubscribed };
  }, [subscribers]);

  async function loadContent() {
    const [subscriberResult, settingsResult] = await Promise.all([
      supabase.from("newsletter_subscribers").select("id,email,name,status,source_page,subscribed_at,created_at").order("subscribed_at", { ascending: false }).limit(200),
      supabase.from("newsletter_settings").select("section_key,display_order,enabled,title,max_items").order("display_order", { ascending: true }),
    ]);

    if (!subscriberResult.error && Array.isArray(subscriberResult.data)) setSubscribers(subscriberResult.data);
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
    if (!currentUser) { setMessage("Please login to manage newsletters."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Newsletter management requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadContent();
    setMessage("");
    setLoading(false);
  }

  async function saveSettings() {
    setActionMessage("Saving newsletter control...");
    const payload = sections.map((section, index) => ({
      section_key: section.section_key,
      display_order: numberValue(section.display_order, index + 1),
      enabled: section.enabled !== false,
      title: section.title || null,
      max_items: Math.max(1, numberValue(section.max_items, 4)),
    }));
    const { error } = await supabase.from("newsletter_settings").upsert(payload, { onConflict: "section_key" });
    if (error) { setActionMessage(`Could not save newsletter control: ${error.message}`); return; }
    setActionMessage("Newsletter control saved.");
    await loadContent();
  }

  async function seedDefaults() {
    setActionMessage("Creating default newsletter control...");
    const { error } = await supabase.from("newsletter_settings").upsert(defaultSections, { onConflict: "section_key" });
    if (error) { setActionMessage(`Could not seed defaults: ${error.message}`); return; }
    setActionMessage("Default newsletter control created.");
    await loadContent();
  }

  function updateSection(index: number, field: string, value: any) {
    setSections((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((item, itemIndex) => ({ ...item, display_order: itemIndex + 1 })));
  }

  function generateDraft() {
    const enabled = sections.filter((section) => section.enabled !== false).sort((a, b) => numberValue(a.display_order, 999) - numberValue(b.display_order, 999));
    const now = new Date();
    setDraft({
      subject: `Seattle Desi TV Community Update - ${now.toLocaleDateString()}`,
      intro: "Here are the latest stories, events, interviews, and community updates from Seattle Desi TV.",
      sections: enabled.map((section) => ({ ...section, body: `Add ${section.title || section.section_key} content here.` })),
    });
    setActionMessage("Draft created. This is editable and not sent.");
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Newsletter Studio</h1>
            <p className="text-slate-300 mt-2">Admin-only subscriber list, newsletter control, and editable draft builder.</p>
            {user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            <button onClick={generateDraft} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold">Generate Draft</button>
          </div>
        </div>

        {loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}

        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

          <section className="grid gap-4 md:grid-cols-4">
            {[ ["Total", stats.total], ["Active", stats.active], ["Pending", stats.pending], ["Unsubscribed", stats.unsubscribed] ].map(([label, value]) => <div key={label as string} className="rounded-2xl bg-white p-5 text-slate-950 shadow-xl"><p className="text-sm font-black text-slate-500">{label}</p><p className="mt-2 text-4xl font-black text-pink-600">{value as number}</p></div>)}
          </section>

          <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div><h2 className="text-2xl font-black">Newsletter Control</h2><p className="text-gray-600 text-sm mt-1">Independent from homepage order. Enable, reorder, rename, and set item limits for newsletter drafts.</p></div>
              <div className="flex gap-3"><button onClick={seedDefaults} className="border px-4 py-2 rounded-xl font-bold">Seed Defaults</button><button onClick={saveSettings} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold">Save Control</button></div>
            </div>
            <div className="grid gap-4">{sections.map((section, index) => <article key={section.section_key} className="border rounded-2xl p-4 grid lg:grid-cols-[160px_120px_1fr_120px_auto] gap-3 items-center"><div><p className="font-black">{section.section_key}</p><p className="text-xs text-gray-500">Order {section.display_order}</p></div><label className="flex items-center gap-2 font-bold text-sm"><input type="checkbox" checked={section.enabled !== false} onChange={(event) => updateSection(index, "enabled", event.target.checked)} /> Enabled</label><input className="border rounded-lg p-3" placeholder="Title" value={section.title || ""} onChange={(event) => updateSection(index, "title", event.target.value)} /><input className="border rounded-lg p-3" type="number" min="1" max="20" value={section.max_items || 1} onChange={(event) => updateSection(index, "max_items", event.target.value)} /><div className="flex gap-2 justify-end"><button onClick={() => moveSection(index, -1)} className="border px-3 py-2 rounded-lg font-bold">Up</button><button onClick={() => moveSection(index, 1)} className="border px-3 py-2 rounded-lg font-bold">Down</button></div></article>)}</div>
          </section>

          {draft && <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-black">Draft Preview</h2>
            <p className="text-gray-600 text-sm mt-1">Editable starter draft. No email is sent from this page yet.</p>
            <input className="mt-5 w-full border rounded-xl p-3 font-bold" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
            <textarea className="mt-3 w-full border rounded-xl p-3" rows={3} value={draft.intro} onChange={(event) => setDraft({ ...draft, intro: event.target.value })} />
            <div className="mt-5 grid gap-3">{draft.sections.map((section: any, index: number) => <div key={section.section_key} className="rounded-2xl border p-4"><h3 className="font-black">{section.title}</h3><textarea className="mt-2 w-full border rounded-xl p-3" rows={3} value={section.body} onChange={(event) => setDraft({ ...draft, sections: draft.sections.map((item: any, itemIndex: number) => itemIndex === index ? { ...item, body: event.target.value } : item) })} /></div>)}</div>
          </section>}

          <section className="bg-white text-slate-950 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-black mb-4">Recent Subscribers</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left border-b"><th className="py-3">Email</th><th>Name</th><th>Status</th><th>Source</th><th>Subscribed</th></tr></thead><tbody>{subscribers.slice(0, 50).map((subscriber) => <tr key={subscriber.id || subscriber.email} className="border-b"><td className="py-3 font-bold">{subscriber.email}</td><td>{subscriber.name || "—"}</td><td>{subscriber.status || "active"}</td><td>{subscriber.source_page || "—"}</td><td>{subscriber.subscribed_at ? new Date(subscriber.subscribed_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>
          </section>
        </div>}
      </div>
    </main>
  );
}

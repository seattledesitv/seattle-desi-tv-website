"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

const emptyForm = {
  title: "",
  subtitle: "",
  platform: "instagram",
  content_type: "reel",
  content_url: "",
  thumbnail_url: "",
  button_text: "View Post",
  display_order: 1,
  active: true,
  featured: true,
};

export default function FeaturedSocialStudioPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading featured social content...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadItems() {
    const { data, error } = await supabase.from("featured_social_content").select("id,title,subtitle,platform,content_type,content_url,thumbnail_url,button_text,active,featured,display_order,created_at,updated_at").order("display_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load featured social content: ${error.message}`); setItems([]); return; }
    setItems(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage featured social content."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Featured social content requires admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadItems();
    setMessage("");
    setLoading(false);
  }

  function updateForm(field: string, value: any) { setForm((current: any) => ({ ...current, [field]: value })); }
  function editItem(item: any) { setEditingId(item.id); setForm({ title: item.title || "", subtitle: item.subtitle || "", platform: item.platform || "instagram", content_type: item.content_type || "reel", content_url: item.content_url || "", thumbnail_url: item.thumbnail_url || "", button_text: item.button_text || "View Post", display_order: item.display_order || 1, active: item.active !== false, featured: item.featured !== false }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function resetForm() { setEditingId(null); setForm(emptyForm); }

  async function saveItem() {
    if (!form.title || !form.content_url) { setActionMessage("Title and content URL are required."); return; }
    setActionMessage(editingId ? "Updating featured item..." : "Adding featured item...");
    const payload = { title: form.title, subtitle: form.subtitle || null, platform: form.platform || "instagram", content_type: form.content_type || "reel", content_url: form.content_url, thumbnail_url: form.thumbnail_url || null, button_text: form.button_text || "View Post", display_order: Number(form.display_order || 1), active: Boolean(form.active), featured: Boolean(form.featured), updated_at: new Date().toISOString() };
    const result = editingId ? await supabase.from("featured_social_content").update(payload).eq("id", editingId) : await supabase.from("featured_social_content").insert(payload);
    if (result.error) { setActionMessage(`Could not save: ${result.error.message}`); return; }
    setActionMessage("Featured social content saved. Refresh the homepage to see changes.");
    resetForm();
    await loadItems();
  }

  async function toggleActive(item: any) {
    const { error } = await supabase.from("featured_social_content").update({ active: item.active === false, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) { setActionMessage(`Could not update active status: ${error.message}`); return; }
    await loadItems();
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-4xl font-black md:text-5xl">Featured Social Content</h1><p className="mt-2 text-slate-300">Manage homepage reels, YouTube shorts, interviews, sponsor posts, and social highlights.</p>{user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div>
          <div className="flex flex-wrap gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button><a href="/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Preview Homepage</a></div>
        </div>
        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
          <section className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black">{editingId ? "Edit Highlight" : "Add Highlight"}</h2><p className="mt-1 text-sm text-gray-600">Paste a public Instagram Reel URL, YouTube URL, or other social link.</p></div>{editingId && <button onClick={resetForm} className="rounded-xl border px-4 py-2 font-bold">Cancel Edit</button>}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-lg border p-3" placeholder="Title" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
              <input className="rounded-lg border p-3" placeholder="Subtitle" value={form.subtitle} onChange={(event) => updateForm("subtitle", event.target.value)} />
              <select className="rounded-lg border p-3" value={form.platform} onChange={(event) => updateForm("platform", event.target.value)}><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="threads">Threads</option><option value="website">Website</option></select>
              <select className="rounded-lg border p-3" value={form.content_type} onChange={(event) => updateForm("content_type", event.target.value)}><option value="reel">Reel</option><option value="youtube">YouTube</option><option value="interview">Interview</option><option value="event">Event</option><option value="sponsor">Sponsor</option><option value="announcement">Announcement</option></select>
              <input className="rounded-lg border p-3 md:col-span-2" placeholder="Content URL" value={form.content_url} onChange={(event) => updateForm("content_url", event.target.value)} />
              <input className="rounded-lg border p-3" placeholder="Thumbnail URL optional" value={form.thumbnail_url} onChange={(event) => updateForm("thumbnail_url", event.target.value)} />
              <input className="rounded-lg border p-3" placeholder="Button text" value={form.button_text} onChange={(event) => updateForm("button_text", event.target.value)} />
              <input className="rounded-lg border p-3" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => updateForm("display_order", event.target.value)} />
              <div className="flex items-center gap-5"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} /> Active</label><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.featured} onChange={(event) => updateForm("featured", event.target.checked)} /> Featured</label></div>
            </div>
            <button onClick={saveItem} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">{editingId ? "Update Highlight" : "Add Highlight"}</button>
          </section>
          <section className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
            <h2 className="mb-5 text-2xl font-black">Current Highlights</h2>
            <div className="grid gap-4">{items.length === 0 && <p className="text-gray-600">No featured social content added yet.</p>}{items.map((item) => <article key={item.id} className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[80px_1fr_auto] lg:items-center"><div className="grid aspect-square place-items-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-pink-600">{item.thumbnail_url ? <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" /> : item.platform || "social"}</div><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Order {item.display_order || 1} · {item.platform || "instagram"} · {item.content_type || "reel"} · {item.active ? "Active" : "Hidden"}</p><h3 className="text-xl font-black">{item.title}</h3>{item.subtitle && <p className="text-gray-600">{item.subtitle}</p>}<a href={item.content_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-bold text-pink-600">Open link →</a></div><div className="flex gap-2 lg:justify-end"><button onClick={() => editItem(item)} className="rounded-lg border px-4 py-2 font-bold">Edit</button><button onClick={() => toggleActive(item)} className="rounded-lg border px-4 py-2 font-bold">{item.active ? "Hide" : "Show"}</button></div></article>)}</div>
          </section>
        </div>}
      </div>
    </main>
  );
}

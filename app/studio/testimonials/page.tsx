"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const emptyForm = { name: "", title: "", quote: "", image_url: "", display_order: 1, active: true };

export default function TestimonialsStudioPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading testimonials...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadItems() {
    const { data, error } = await supabase.from("homepage_testimonials").select("id,name,title,quote,image_url,display_order,active,created_at,updated_at").order("display_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) { setActionMessage(`Could not load testimonials: ${error.message}`); setItems([]); return; }
    setItems(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage testimonials."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage(`Testimonials require admin access. Current role: ${nextRole}`); setLoading(false); return; }
    await loadItems();
    setMessage("");
    setLoading(false);
  }

  function updateForm(field: string, value: any) { setForm((current: any) => ({ ...current, [field]: value })); }
  function resetForm() { setEditingId(null); setForm(emptyForm); }
  function editItem(item: any) { setEditingId(item.id); setForm({ name: item.name || "", title: item.title || "", quote: item.quote || "", image_url: item.image_url || "", display_order: item.display_order || 1, active: item.active !== false }); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function saveItem() {
    if (!form.name || !form.quote) { setActionMessage("Name and testimonial text are required."); return; }
    setActionMessage(editingId ? "Updating testimonial..." : "Adding testimonial...");
    const payload = { name: form.name, title: form.title || null, quote: form.quote, image_url: form.image_url || null, display_order: Number(form.display_order || 1), active: Boolean(form.active), updated_at: new Date().toISOString() };
    const result = editingId ? await supabase.from("homepage_testimonials").update(payload).eq("id", editingId) : await supabase.from("homepage_testimonials").insert(payload);
    if (result.error) { setActionMessage(`Could not save: ${result.error.message}`); return; }
    setActionMessage("Testimonial saved. Refresh the homepage to see changes.");
    resetForm();
    await loadItems();
  }

  async function toggleActive(item: any) {
    const { error } = await supabase.from("homepage_testimonials").update({ active: item.active === false, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) { setActionMessage(`Could not update active status: ${error.message}`); return; }
    await loadItems();
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><h1 className="text-4xl font-black md:text-5xl">Homepage Testimonials</h1><p className="mt-2 text-slate-300">Add supporter quotes with picture, name, title and testimonial text.</p>{user?.email && <p className="mt-2 text-sm text-slate-400">Logged in as {user.email} · Role: {role}</p>}</div>
          <div className="flex flex-wrap gap-3"><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Refresh</button><a href="/" target="_blank" rel="noreferrer" className="rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Preview Homepage</a></div>
        </div>
        {loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}
        {!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}
        {!loading && canAccess && <div className="space-y-8">
          {actionMessage && <div className="rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}
          <section className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-4"><div><h2 className="text-2xl font-black">{editingId ? "Edit Testimonial" : "Add Testimonial"}</h2><p className="mt-1 text-sm text-gray-600">Use a public image URL for now. Cloudinary image upload can be added later.</p></div>{editingId && <button onClick={resetForm} className="rounded-xl border px-4 py-2 font-bold">Cancel Edit</button>}</div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="rounded-lg border p-3" placeholder="Name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              <input className="rounded-lg border p-3" placeholder="Title / role optional" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
              <input className="rounded-lg border p-3 md:col-span-2" placeholder="Picture URL" value={form.image_url} onChange={(event) => updateForm("image_url", event.target.value)} />
              <textarea className="rounded-lg border p-3 md:col-span-2" rows={5} placeholder="Testimonial text" value={form.quote} onChange={(event) => updateForm("quote", event.target.value)} />
              <input className="rounded-lg border p-3" type="number" placeholder="Display order" value={form.display_order} onChange={(event) => updateForm("display_order", event.target.value)} />
              <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} /> Active</label>
            </div>
            <button onClick={saveItem} className="mt-5 rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">{editingId ? "Update Testimonial" : "Add Testimonial"}</button>
          </section>
          <section className="rounded-2xl bg-white p-6 text-slate-950 shadow-xl">
            <h2 className="mb-5 text-2xl font-black">Current Testimonials</h2>
            <div className="grid gap-4">{items.length === 0 && <p className="text-gray-600">No testimonials added yet.</p>}{items.map((item) => <article key={item.id} className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-[80px_1fr_auto] lg:items-center"><div className="grid aspect-square place-items-center overflow-hidden rounded-full bg-slate-100 text-xl font-black text-pink-600">{item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : item.name?.charAt(0)}</div><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Order {item.display_order || 1} · {item.active ? "Active" : "Hidden"}</p><h3 className="text-xl font-black">{item.name}</h3>{item.title && <p className="text-gray-500">{item.title}</p>}<p className="mt-1 line-clamp-2 text-gray-700">{item.quote}</p></div><div className="flex gap-2 lg:justify-end"><button onClick={() => editItem(item)} className="rounded-lg border px-4 py-2 font-bold">Edit</button><button onClick={() => toggleActive(item)} className="rounded-lg border px-4 py-2 font-bold">{item.active ? "Hide" : "Show"}</button></div></article>)}</div>
          </section>
        </div>}
      </div>
    </main>
  );
}

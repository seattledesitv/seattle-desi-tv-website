"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function MyBusinessesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<any>({});

  async function loadRows() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) { setMessage("Please login to view your submitted listings."); return; }
    const { data, error } = await supabase
      .from("local_businesses")
      .select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,status,created_at,created_by")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setMessage(error ? error.message : "Listings submitted from your profile.");
  }

  function startEdit(row: any) {
    setEditingId(row.id);
    setEditForm({
      name: row.name || "",
      address: row.address || "",
      website: row.website || "",
      category: row.category || "",
      discount: row.discount || "",
      offer: row.offer || "",
      poc_name: row.poc_name || "",
      poc_email: row.poc_email || "",
      poc_phone: row.poc_phone || "",
    });
  }

  async function saveBusiness(row: any) {
    setMessage("");
    if (!editForm.name?.trim() || !editForm.address?.trim()) {
      setMessage("Please enter business name and address.");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id || row.created_by !== user.id) {
      setSaving(false);
      setMessage("You can only edit business listings submitted from your own profile.");
      return;
    }
    const payload = {
      name: editForm.name.trim(),
      address: editForm.address.trim(),
      website: editForm.website?.trim() || null,
      category: editForm.category?.trim() || null,
      discount: editForm.discount?.trim() || null,
      offer: editForm.offer?.trim() || null,
      poc_name: editForm.poc_name?.trim() || null,
      poc_email: editForm.poc_email?.trim() || null,
      poc_phone: editForm.poc_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("local_businesses").update(payload).eq("id", row.id).eq("created_by", user.id);
    setSaving(false);
    if (error) {
      setMessage(`Could not update listing: ${error.message}`);
      return;
    }
    setEditingId("");
    setEditForm({});
    setMessage("Business listing updated. If it is already approved, SDTV admins may review changes if needed.");
    await loadRows();
  }

  useEffect(() => { loadRows(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
            <h1 className="text-4xl md:text-5xl font-black mt-2">Business Listings</h1>
            <p className="text-slate-300 mt-2">{message}</p>
          </div>
          <a href="/businesses" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black text-center">Add Business</a>
        </div>
        {rows.length === 0 ? <div className="bg-white text-slate-950 rounded-3xl p-8">No listings found.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map((row) => <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 block shadow-xl border"><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-black">{row.name}</h2><span className="shrink-0 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-600">{statusText(row.status)}</span></div>{row.category && <p className="text-gray-600 mt-2">{row.category}</p>}{editingId === row.id ? <div className="mt-5 grid gap-3"><input className="rounded-xl border p-3" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Business name" /><input className="rounded-xl border p-3" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" /><input className="rounded-xl border p-3" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="Website" /><input className="rounded-xl border p-3" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" /><input className="rounded-xl border p-3" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} placeholder="Discount / special offer" /><textarea className="min-h-24 rounded-xl border p-3" value={editForm.offer} onChange={(e) => setEditForm({ ...editForm, offer: e.target.value })} placeholder="Offer / description" /><input className="rounded-xl border p-3" value={editForm.poc_name} onChange={(e) => setEditForm({ ...editForm, poc_name: e.target.value })} placeholder="Contact name" /><input className="rounded-xl border p-3" value={editForm.poc_email} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} placeholder="Contact email" /><input className="rounded-xl border p-3" value={editForm.poc_phone} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} placeholder="Contact phone" /><div className="flex gap-2"><button onClick={() => saveBusiness(row)} disabled={saving} className="flex-1 rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button><button onClick={() => { setEditingId(""); setEditForm({}); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">Cancel</button></div></div> : <div className="mt-5 flex flex-wrap gap-2"><a href="/businesses" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">View Directory</a><button onClick={() => startEdit(row)} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Edit</button></div>}</article>)}</div>}
      </section>
      <SiteFooter />
    </main>
  );
}

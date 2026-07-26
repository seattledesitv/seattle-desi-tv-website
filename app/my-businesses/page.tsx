"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import DirectoryImageCropper, { type DirectoryImageCrop } from "../components/DirectoryImageCropper";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { validateOptionalImageFile } from "../lib/validation";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-black text-slate-800"><span>{label}</span>{children}</label>;
}

type BusinessRow = {
  id: string;
  name: string;
  address?: string;
  website?: string;
  category?: string;
  discount?: string;
  offer?: string;
  poc_name?: string;
  poc_email?: string;
  poc_phone?: string;
  image?: string;
  image_urls?: string[];
  image_position_x?: number;
  image_position_y?: number;
  image_zoom?: number;
  status?: string;
  created_by?: string;
  owner_verified_at?: string;
  access_type?: "submitted" | "claimed";
  manager_role?: string;
};

async function uploadBusinessImage(file: File) {
  const validation = validateOptionalImageFile(file, "Business image", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured.");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "seattle-desi-tv/businesses");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Image upload failed.");
  return String(result.secure_url || "");
}

export default function MyBusinessesPage() {
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTab, setEditTab] = useState<"general" | "media">("general");
  const [editForm, setEditForm] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageCrop, setImageCrop] = useState<DirectoryImageCrop>({ x: 50, y: 50, zoom: 1 });
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState<any>(null);

  async function loadRows() {
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    setUser(currentUser);
    if (!currentUser?.id) { setMessage("Please login to view your submitted and claimed listings."); return; }

    const columns = "id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,image,image_urls,image_position_x,image_position_y,image_zoom,status,created_at,created_by,owner_verified_at";
    const submittedResult = await supabase.from("local_businesses").select(columns).eq("created_by", currentUser.id).order("created_at", { ascending: false });
    const managedResult = await supabase.from("business_managers").select(`role,is_primary,local_businesses(${columns})`).eq("user_id", currentUser.id).eq("active", true);
    if (submittedResult.error) { setMessage(submittedResult.error.message); return; }

    const map = new Map<string, BusinessRow>();
    (submittedResult.data || []).forEach((row: any) => map.set(row.id, { ...row, access_type: "submitted" }));
    if (!managedResult.error) (managedResult.data || []).forEach((manager: any) => {
      const business = manager.local_businesses;
      if (business) map.set(business.id, { ...business, access_type: "claimed", manager_role: manager.role });
    });

    const nextRows = Array.from(map.values());
    setRows(nextRows);
    setSelectedId((current) => current && nextRows.some((row) => row.id === current) ? current : nextRows[0]?.id || "");
    setMessage(managedResult.error ? `Submitted listings loaded, but claimed-business access could not be loaded: ${managedResult.error.message}` : "Submitted and claimed business profiles.");
  }

  useEffect(() => { void loadRows(); }, []);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((row) => (statusFilter === "all" || String(row.status || "pending").toLowerCase() === statusFilter) && (!q || [row.name, row.address, row.website, row.category, row.offer, row.poc_name, row.poc_email, row.poc_phone, row.status, row.access_type].some((value) => String(value || "").toLowerCase().includes(q))));
  }, [rows, searchText, statusFilter]);

  const selectedRow = rows.find((row) => row.id === selectedId) || filteredRows[0] || null;

  function startEdit(row: BusinessRow) {
    setSelectedId(row.id);
    setEditingId(row.id);
    setEditTab("general");
    setImageFile(null);
    setImageCrop({ x: Number(row.image_position_x ?? 50), y: Number(row.image_position_y ?? 50), zoom: Number(row.image_zoom ?? 1) });
    setEditForm({ name: row.name || "", address: row.address || "", website: row.website || "", category: row.category || "", discount: row.discount || "", offer: row.offer || "", poc_name: row.poc_name || "", poc_email: row.poc_email || "", poc_phone: row.poc_phone || "" });
  }

  async function saveBusiness(row: BusinessRow) {
    if (!user?.id) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = { name: editForm.name?.trim(), address: editForm.address?.trim(), website: editForm.website?.trim() || null, category: editForm.category?.trim() || null, discount: editForm.discount?.trim() || null, offer: editForm.offer?.trim() || null, poc_name: editForm.poc_name?.trim() || null, poc_email: editForm.poc_email?.trim() || null, poc_phone: editForm.poc_phone?.trim() || null };
      if (!payload.name || !payload.address) throw new Error("Business name and address are required.");

      if (row.access_type === "claimed" && row.created_by !== user.id) {
        const suggestion = ["Verified owner profile update:", ...Object.entries(payload).map(([key, value]) => `${key}: ${value || "(remove)"}`)].join("\n");
        const result = await supabase.from("business_edit_suggestions").insert({ business_id: row.id, submitter_user_id: user.id, submitter_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email, submitter_email: user.email, suggestion, status: "pending" });
        if (result.error) throw result.error;
        setMessage("Your profile changes were submitted to SDTV for approval.");
      } else {
        const result = await supabase.from("local_businesses").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", row.id).eq("created_by", user.id);
        if (result.error) throw result.error;
        setMessage("Business listing updated.");
      }
      setEditingId("");
      await loadRows();
    } catch (error: any) {
      setMessage(error?.message || "Could not save the business listing.");
    } finally { setSaving(false); }
  }

  async function saveMedia(row: BusinessRow) {
    setSaving(true);
    setMessage("Saving image and directory preview...");
    try {
      const currentImage = row.image || row.image_urls?.[0] || "";
      const imageUrl = imageFile ? await uploadBusinessImage(imageFile) : currentImage;
      if (!imageUrl) throw new Error("Choose an image first.");
      const existing = Array.isArray(row.image_urls) ? row.image_urls : [];
      const imageUrls = Array.from(new Set([imageUrl, ...existing]));
      const result = await supabase.from("local_businesses").update({ image: imageUrl, image_urls: imageUrls, image_position_x: imageCrop.x, image_position_y: imageCrop.y, image_zoom: imageCrop.zoom, updated_at: new Date().toISOString() }).eq("id", row.id);
      if (result.error) throw result.error;
      setImageFile(null);
      setMessage("Business image and visible card area saved.");
      await loadRows();
    } catch (error: any) {
      setMessage(error?.message || "Could not save the business image.");
    } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader/><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">My Hub</p><h1 className="mt-2 text-4xl font-black md:text-5xl">My Businesses</h1><p className="mt-2 text-slate-300">{message}</p></div><a href="/businesses" className="rounded-xl bg-pink-600 px-5 py-3 text-center font-black text-white">Business Directory</a></div>
    <section className="mb-6 rounded-3xl bg-white/10 p-4"><div className="grid gap-3 md:grid-cols-[1fr_180px]"><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search your businesses..." className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"/><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl bg-white px-4 py-3 font-bold text-slate-950"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div></section>
    {rows.length === 0 ? <div className="rounded-3xl bg-white p-8 text-slate-950">No submitted or claimed businesses found.</div> : <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <aside className="grid h-fit max-h-[78vh] gap-4 overflow-y-auto">{filteredRows.map((row) => <button key={row.id} onClick={() => { setSelectedId(row.id); setEditingId(""); }} className={`rounded-3xl border p-4 text-left text-slate-950 ${selectedRow?.id === row.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black">{row.name}</h2><span className="rounded-full bg-pink-50 px-2 py-1 text-[11px] font-black text-pink-600">{statusText(row.status)}</span></div><p className="mt-2 text-sm text-slate-600">{row.category || "Business"} · {row.address || "No address"}</p><p className="mt-2 text-xs font-black uppercase text-emerald-700">{row.access_type === "claimed" ? `Claimed · ${row.manager_role || "owner"}` : "Submitted by you"}</p></button>)}</aside>
      <section className="min-h-[560px] rounded-[2rem] bg-white p-6 text-slate-950 shadow-2xl">
        {!selectedRow ? <p>Select a business.</p> : editingId === selectedRow.id ? <div className="grid gap-5">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs font-black uppercase text-pink-600">Manage business</p><h2 className="text-3xl font-black">{selectedRow.name}</h2>{selectedRow.access_type === "claimed" && selectedRow.created_by !== user?.id && <p className="mt-2 text-sm text-amber-700">Profile text changes are sent to SDTV for approval.</p>}</div><button onClick={() => setEditingId("")} className="rounded-xl bg-slate-100 px-4 py-3 font-black">Cancel</button></div>
          <div className="flex gap-2 border-b pb-3"><button onClick={() => setEditTab("general")} className={`rounded-xl px-4 py-2 font-black ${editTab === "general" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>General</button><button onClick={() => setEditTab("media")} className={`rounded-xl px-4 py-2 font-black ${editTab === "media" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Media</button></div>
          {editTab === "general" ? <><div className="grid gap-4 md:grid-cols-2"><Field label="Business name"><input className="rounded-xl border p-3 font-normal" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}/></Field><Field label="Category"><input className="rounded-xl border p-3 font-normal" value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}/></Field><Field label="Address"><input className="rounded-xl border p-3 font-normal" value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })}/></Field><Field label="Website"><input className="rounded-xl border p-3 font-normal" value={editForm.website} onChange={(event) => setEditForm({ ...editForm, website: event.target.value })}/></Field><Field label="Discount / special offer"><input className="rounded-xl border p-3 font-normal" value={editForm.discount} onChange={(event) => setEditForm({ ...editForm, discount: event.target.value })}/></Field><Field label="Contact name"><input className="rounded-xl border p-3 font-normal" value={editForm.poc_name} onChange={(event) => setEditForm({ ...editForm, poc_name: event.target.value })}/></Field><Field label="Contact email"><input className="rounded-xl border p-3 font-normal" value={editForm.poc_email} onChange={(event) => setEditForm({ ...editForm, poc_email: event.target.value })}/></Field><Field label="Contact phone"><input className="rounded-xl border p-3 font-normal" value={editForm.poc_phone} onChange={(event) => setEditForm({ ...editForm, poc_phone: event.target.value })}/></Field><Field label="Description / offer"><textarea className="min-h-28 rounded-xl border p-3 font-normal" value={editForm.offer} onChange={(event) => setEditForm({ ...editForm, offer: event.target.value })}/></Field></div><button onClick={() => saveBusiness(selectedRow)} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : selectedRow.access_type === "claimed" && selectedRow.created_by !== user?.id ? "Submit Profile Changes for Approval" : "Save Business Listing"}</button></> : <><DirectoryImageCropper src={selectedRow.image || selectedRow.image_urls?.[0] || ""} value={imageCrop} onChange={setImageCrop} onFileChange={setImageFile} label="Upload or replace business cover image"/><button onClick={() => saveMedia(selectedRow)} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Image and Card Position"}</button></>}
        </div> : <div><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-3xl font-black">{selectedRow.name}</h2>{selectedRow.owner_verified_at && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">✓ Owner verified</span>}</div><p className="mt-2 text-slate-600">{selectedRow.category || "Business"} · {selectedRow.address || "No address"}</p></div><button onClick={() => startEdit(selectedRow)} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Manage business</button></div>{(selectedRow.image || selectedRow.image_urls?.[0]) && <div className="mt-6 overflow-hidden rounded-2xl border bg-slate-100"><img src={selectedRow.image || selectedRow.image_urls?.[0]} alt={selectedRow.name} className="aspect-[16/9] w-full object-cover" style={{ objectPosition: `${selectedRow.image_position_x ?? 50}% ${selectedRow.image_position_y ?? 50}%`, transform: `scale(${selectedRow.image_zoom ?? 1})` }}/></div>}<div className="mt-6 grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm md:grid-cols-2"><p><b>Access:</b><br/>{selectedRow.access_type === "claimed" ? `Claimed ${selectedRow.manager_role || "owner"}` : "Submitted by you"}</p><p><b>Status:</b><br/>{statusText(selectedRow.status)}</p><p><b>Website:</b><br/>{selectedRow.website || "—"}</p><p><b>Contact:</b><br/>{[selectedRow.poc_name, selectedRow.poc_email, selectedRow.poc_phone].filter(Boolean).join(" · ") || "—"}</p><p className="md:col-span-2"><b>Description / offer:</b><br/>{selectedRow.offer || "—"}</p></div></div>}
      </section>
    </div>}
  </section><SiteFooter/></main>;
}

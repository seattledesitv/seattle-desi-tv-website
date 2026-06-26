"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
function businessImages(row: any) {
  const urls = Array.isArray(row?.image_urls) ? row.image_urls.filter(Boolean) : [];
  if (row?.image && !urls.includes(row.image)) urls.unshift(row.image);
  return urls;
}
async function uploadBusinessImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload image files only.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be 5MB or smaller.");
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured. Paste image URLs instead.");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  body.append("folder", "seattle-desi-tv/businesses");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result?.error?.message || "Image upload failed.");
  return result.secure_url as string;
}

export default function MyBusinessesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);
  const [viewingId, setViewingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  async function loadRows() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) { setMessage("Please login to view your submitted listings."); return; }
    const { data, error } = await supabase
      .from("local_businesses")
      .select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,image,image_urls,status,created_at,created_by")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setMessage(error ? error.message : "Listings submitted from your profile.");
  }

  function startEdit(row: any) {
    setViewingId(row.id);
    setEditingId(row.id);
    setImageFiles([]);
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
      image_urls: businessImages(row),
      image_url_input: "",
    });
  }

  function addImageUrl() {
    const url = String(editForm.image_url_input || "").trim();
    if (!url) return;
    setEditForm({ ...editForm, image_urls: [...(editForm.image_urls || []), url], image_url_input: "" });
  }

  function removeImage(index: number) {
    setEditForm({ ...editForm, image_urls: (editForm.image_urls || []).filter((_url: string, i: number) => i !== index) });
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
    try {
      const uploadedUrls = imageFiles.length ? await Promise.all(imageFiles.map(uploadBusinessImage)) : [];
      const imageUrls = [...(editForm.image_urls || []), ...uploadedUrls].filter(Boolean);
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
        image: imageUrls[0] || null,
        image_urls: imageUrls.length ? imageUrls : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("local_businesses").update(payload).eq("id", row.id).eq("created_by", user.id);
      if (error) throw error;
      setEditingId("");
      setEditForm({});
      setImageFiles([]);
      setMessage("Business listing updated. If it is already approved, SDTV admins may review changes if needed.");
      await loadRows();
    } catch (error: any) {
      setMessage(`Could not update listing: ${error.message || error}`);
    } finally {
      setSaving(false);
    }
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
        {rows.length === 0 ? <div className="bg-white text-slate-950 rounded-3xl p-8">No listings found.</div> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map((row) => {
          const images = businessImages(row);
          return <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 block shadow-xl border"><div className="flex items-start justify-between gap-3"><h2 className="text-2xl font-black">{row.name}</h2><span className="shrink-0 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-600">{statusText(row.status)}</span></div>{row.category && <p className="text-gray-600 mt-2">{row.category}</p>}
            {viewingId === row.id && editingId !== row.id && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{images.length > 0 && <div className="mb-4 grid grid-cols-2 gap-2">{images.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${row.name} ${index + 1}`} className="h-28 w-full rounded-xl object-cover border bg-white" />)}</div>}<p><b>Address:</b> {row.address || "—"}</p><p className="mt-2"><b>Website:</b> {row.website || "—"}</p><p className="mt-2"><b>Offer:</b> {row.offer || "—"}</p><p className="mt-2"><b>Contact:</b> {[row.poc_name, row.poc_email, row.poc_phone].filter(Boolean).join(" · ") || "—"}</p></div>}
            {editingId === row.id ? <div className="mt-5 grid gap-3"><input className="rounded-xl border p-3" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Business name" /><input className="rounded-xl border p-3" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" /><input className="rounded-xl border p-3" value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="Website" /><input className="rounded-xl border p-3" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} placeholder="Category" /><input className="rounded-xl border p-3" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })} placeholder="Discount / special offer" /><textarea className="min-h-24 rounded-xl border p-3" value={editForm.offer} onChange={(e) => setEditForm({ ...editForm, offer: e.target.value })} placeholder="Offer / description" /><input className="rounded-xl border p-3" value={editForm.poc_name} onChange={(e) => setEditForm({ ...editForm, poc_name: e.target.value })} placeholder="Contact name" /><input className="rounded-xl border p-3" value={editForm.poc_email} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} placeholder="Contact email" /><input className="rounded-xl border p-3" value={editForm.poc_phone} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} placeholder="Contact phone" />
              <div className="rounded-2xl bg-slate-50 p-4"><p className="font-black">Business Images</p>{(editForm.image_urls || []).length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{editForm.image_urls.map((url: string, index: number) => <div key={`${url}-${index}`} className="relative"><img src={url} alt={`Business image ${index + 1}`} className="h-28 w-full rounded-xl border bg-white object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">Remove</button></div>)}</div>}<label className="mt-3 block text-sm font-bold">Upload more images<input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal" /></label>{imageFiles.length > 0 && <p className="mt-2 text-xs font-bold text-slate-500">{imageFiles.length} new image(s) selected. They upload when you click Save.</p>}<div className="mt-3 flex gap-2"><input className="flex-1 rounded-xl border bg-white p-3" value={editForm.image_url_input || ""} onChange={(e) => setEditForm({ ...editForm, image_url_input: e.target.value })} placeholder="Paste image URL" /><button type="button" onClick={addImageUrl} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Add URL</button></div></div>
              <div className="flex gap-2"><button onClick={() => saveBusiness(row)} disabled={saving} className="flex-1 rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button><button onClick={() => { setEditingId(""); setEditForm({}); setImageFiles([]); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">Cancel</button></div></div> : <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setViewingId(viewingId === row.id ? "" : row.id)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{viewingId === row.id ? "Hide" : "View"}</button><button onClick={() => startEdit(row)} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Edit</button></div>}</article>;
        })}</div>}
      </section>
      <SiteFooter />
    </main>
  );
}

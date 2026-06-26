"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateInput(value?: string | null) { return String(value || "").split("T")[0]; }
function eventImages(row: any) {
  const urls = Array.isArray(row?.image_urls) ? row.image_urls.filter(Boolean) : [];
  if (row?.image && !urls.includes(row.image)) urls.unshift(row.image);
  return urls;
}
async function uploadEventImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload image files only.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Each image must be 5MB or smaller.");
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured. Paste image URLs instead.");
  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  body.append("folder", "seattle-desi-tv/events");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result?.error?.message || "Image upload failed.");
  return result.secure_url as string;
}

export default function MyEventsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("Loading your event listings...");
  const [rows, setRows] = useState<any[]>([]);
  const [viewingId, setViewingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  async function loadRows() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id) {
      setRows([]);
      setMessage("Please login to view event listings submitted from your profile.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,ticket_url,poc_email,poc_phone,image,image_urls,status,created_at,created_by")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setMessage(error ? error.message : "Event listings submitted from your profile.");
    setLoading(false);
  }

  function startEdit(row: any) {
    setViewingId(row.id);
    setEditingId(row.id);
    setImageFiles([]);
    setEditForm({
      title: row.title || "",
      date: dateInput(row.date),
      location: row.location || "",
      description: row.description || "",
      ticket_url: row.ticket_url || "",
      poc_email: row.poc_email || "",
      poc_phone: row.poc_phone || "",
      image_urls: eventImages(row),
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

  async function saveEvent(row: any) {
    setMessage("");
    if (!editForm.title?.trim() || !editForm.date || !editForm.location?.trim()) {
      setMessage("Please enter event title, date, and location.");
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user?.id || row.created_by !== user.id) {
      setSaving(false);
      setMessage("You can only edit event listings submitted from your own profile.");
      return;
    }
    try {
      const uploadedUrls = imageFiles.length ? await Promise.all(imageFiles.map(uploadEventImage)) : [];
      const imageUrls = [...(editForm.image_urls || []), ...uploadedUrls].filter(Boolean);
      const payload = {
        title: editForm.title.trim(),
        date: editForm.date,
        location: editForm.location.trim(),
        description: editForm.description?.trim() || null,
        ticket_url: editForm.ticket_url?.trim() || null,
        poc_email: editForm.poc_email?.trim() || null,
        poc_phone: editForm.poc_phone?.trim() || null,
        image: imageUrls[0] || null,
        image_urls: imageUrls.length ? imageUrls : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("events").update(payload).eq("id", row.id).eq("created_by", user.id);
      if (error) throw error;
      setEditingId("");
      setEditForm({});
      setImageFiles([]);
      setMessage("Event listing updated. If it is already approved, SDTV admins may review changes if needed.");
      await loadRows();
    } catch (error: any) {
      setMessage(`Could not update event listing: ${error.message || error}`);
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
            <h1 className="text-4xl md:text-5xl font-black mt-2">Event Listings</h1>
            <p className="text-slate-300 mt-2">{loading ? "Loading..." : message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/my-events-v2" className="border border-white/20 text-white px-5 py-3 rounded-xl font-black text-center">Open Event Listing Status</a>
            <a href="/events/new" className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black text-center">Submit Event</a>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white text-slate-950 rounded-3xl p-8 border"><h2 className="text-2xl font-black">No event listings found</h2><p className="text-gray-600 mt-2">Your submitted event listings will appear here.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {rows.map((row) => {
              const images = eventImages(row);
              return <article key={row.id} className="bg-white text-slate-950 rounded-3xl p-6 border shadow-xl">
                <div className="flex items-start justify-between gap-4"><h2 className="text-2xl font-black">{row.title}</h2><span className="bg-pink-50 text-pink-600 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">{statusText(row.status)}</span></div>
                <p className="text-gray-600 mt-3">{formatDate(row.date)}{row.location ? ` · ${row.location}` : ""}</p>
                {viewingId === row.id && editingId !== row.id && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{images.length > 0 && <div className="mb-4 grid grid-cols-2 gap-2">{images.map((url, index) => <img key={`${url}-${index}`} src={url} alt={`${row.title} ${index + 1}`} className="h-28 w-full rounded-xl object-cover border bg-white" />)}</div>}<p><b>Description:</b> {row.description || "—"}</p><p className="mt-2"><b>Ticket URL:</b> {row.ticket_url || "—"}</p><p className="mt-2"><b>Organizer email:</b> {row.poc_email || "—"}</p><p className="mt-2"><b>Organizer phone:</b> {row.poc_phone || "—"}</p></div>}
                {editingId === row.id ? <div className="mt-5 grid gap-3"><input className="rounded-xl border p-3" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Event title" /><input className="rounded-xl border p-3" type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} /><input className="rounded-xl border p-3" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} placeholder="Location" /><textarea className="min-h-24 rounded-xl border p-3" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" /><input className="rounded-xl border p-3" value={editForm.ticket_url} onChange={(e) => setEditForm({ ...editForm, ticket_url: e.target.value })} placeholder="Ticket / registration URL" /><input className="rounded-xl border p-3" value={editForm.poc_email} onChange={(e) => setEditForm({ ...editForm, poc_email: e.target.value })} placeholder="Organizer email" /><input className="rounded-xl border p-3" value={editForm.poc_phone} onChange={(e) => setEditForm({ ...editForm, poc_phone: e.target.value })} placeholder="Organizer phone" /><div className="rounded-2xl bg-slate-50 p-4"><p className="font-black">Event Images</p>{(editForm.image_urls || []).length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{editForm.image_urls.map((url: string, index: number) => <div key={`${url}-${index}`} className="relative"><img src={url} alt={`Event image ${index + 1}`} className="h-28 w-full rounded-xl border bg-white object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">Remove</button></div>)}</div>}<label className="mt-3 block text-sm font-bold">Upload more images<input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal" /></label>{imageFiles.length > 0 && <p className="mt-2 text-xs font-bold text-slate-500">{imageFiles.length} new image(s) selected. They upload when you click Save.</p>}<div className="mt-3 flex gap-2"><input className="flex-1 rounded-xl border bg-white p-3" value={editForm.image_url_input || ""} onChange={(e) => setEditForm({ ...editForm, image_url_input: e.target.value })} placeholder="Paste image URL" /><button type="button" onClick={addImageUrl} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Add URL</button></div></div><div className="flex gap-2"><button onClick={() => saveEvent(row)} disabled={saving} className="flex-1 rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button><button onClick={() => { setEditingId(""); setEditForm({}); setImageFiles([]); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700">Cancel</button></div></div> : <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => setViewingId(viewingId === row.id ? "" : row.id)} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{viewingId === row.id ? "Hide" : "View"}</button><button onClick={() => startEdit(row)} className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">Edit</button></div>}
              </article>;
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}

"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import CheckedExternalLink from "../../../components/CheckedExternalLink";
import { firstError, normalizeUrl, requireText, validateImageFile, validateOptionalEmail, validateOptionalPhone, validateOptionalUrl } from "../../../lib/validation";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().trim().includes("admin"); }
function emptyForm() { return { name: "", address: "", website: "", category: "", discount: "", offer: "", poc_name: "", poc_email: "", poc_phone: "", image: "", status: "pending", approved: false }; }

export default function BusinessEditPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [form, setForm] = useState(emptyForm());
  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

  async function loadBusiness() {
    const { data, error } = await supabase.from("local_businesses").select("id,name,address,website,category,discount,offer,poc_name,poc_email,poc_phone,image,status,approved").eq("id", params.id).maybeSingle();
    if (error) { setActionMessage(`Could not load business: ${error.message}`); return; }
    if (!data) { setActionMessage("Business not found."); return; }
    setForm({ name: data.name || "", address: data.address || "", website: data.website || "", category: data.category || "", discount: data.discount || "", offer: data.offer || "", poc_name: data.poc_name || "", poc_email: data.poc_email || "", poc_phone: data.poc_phone || "", image: data.image || "", status: data.status || "pending", approved: Boolean(data.approved) });
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login to edit businesses."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await loadBusiness(); setMessage(""); setLoading(false);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, "Business image", 5);
    if (!validation.ok) { setActionMessage(validation.message || "Please upload a valid image file."); event.target.value = ""; return; }
    if (!cloudinaryReady) { setActionMessage("Cloudinary is not configured. Image URL still works."); event.target.value = ""; return; }
    setUploadingImage(true); setActionMessage("Uploading image...");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadForm.append("folder", "seattle-desi-tv/businesses");
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadForm });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");
      setForm((current) => ({ ...current, image: result.secure_url }));
      setActionMessage("Image uploaded. Save changes to keep it.");
    } catch (error: any) { setActionMessage(`Image upload failed: ${error?.message || String(error)}`); }
    finally { setUploadingImage(false); event.target.value = ""; }
  }

  function validateBusiness() {
    return firstError(requireText(form.name, "Business name", 2), requireText(form.address, "Address", 5), validateOptionalUrl(form.website, "Website"), validateOptionalEmail(form.poc_email, "POC email"), validateOptionalPhone(form.poc_phone, "POC phone"), validateOptionalUrl(form.image, "Image URL"));
  }

  async function saveBusiness() {
    const validationError = validateBusiness();
    if (validationError) { setActionMessage(validationError); return; }
    setSaving(true); setActionMessage("Saving business...");
    const approved = form.status === "approved" || form.approved;
    const payload: any = { name: form.name.trim(), address: form.address.trim(), website: form.website.trim() ? normalizeUrl(form.website) : null, category: form.category.trim(), discount: form.discount.trim(), offer: form.offer.trim(), poc_name: form.poc_name.trim(), poc_email: form.poc_email.trim(), poc_phone: form.poc_phone.trim(), image: form.image.trim(), status: form.status || "pending", approved };
    if (approved) { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("local_businesses").update(payload).eq("id", params.id);
    if (error) { setActionMessage(`Save failed: ${error.message}`); setSaving(false); return; }
    setActionMessage("Business saved."); setSaving(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10"><div className="max-w-5xl mx-auto"><a href="/studio/businesses" className="text-pink-300 font-bold">← Back to Businesses</a><h1 className="text-4xl md:text-5xl font-black mt-3 mb-2">Edit Business</h1><p className="text-slate-300 mb-8">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Business editor"}</p>{loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canAccess && (<section className="bg-white text-slate-950 rounded-2xl p-6 space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-xl p-4 font-bold">{actionMessage}</div>}<div className="grid md:grid-cols-2 gap-4"><label className="grid gap-2 text-sm font-bold">Business Name<input className="border rounded-lg p-3 font-normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Category<input className="border rounded-lg p-3 font-normal" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Address<input className="border rounded-lg p-3 font-normal" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Website<div className="flex flex-col gap-2"><input className="border rounded-lg p-3 font-normal" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />{form.website && <CheckedExternalLink href={form.website} notFoundMessage="Page not found. This business website is not available." className="self-start bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-60">Check / Open Website</CheckedExternalLink>}</div></label><label className="grid gap-2 text-sm font-bold">Offer<input className="border rounded-lg p-3 font-normal" value={form.offer} onChange={(e) => setForm({ ...form, offer: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Discount<input className="border rounded-lg p-3 font-normal" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">POC Name<input className="border rounded-lg p-3 font-normal" value={form.poc_name} onChange={(e) => setForm({ ...form, poc_name: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">POC Email<input className="border rounded-lg p-3 font-normal" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">POC Phone<input className="border rounded-lg p-3 font-normal" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Status<select className="border rounded-lg p-3 font-normal" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, approved: e.target.value === "approved" })}><option value="pending">pending</option><option value="approved">approved</option><option value="on_hold">on_hold</option><option value="rejected">rejected</option></select></label></div><div className="grid gap-2 text-sm font-bold">Image<input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" /><input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL" />{form.image && <img src={form.image} alt="Business preview" className="w-40 h-40 object-cover rounded-xl border" />}<p className="text-xs text-gray-500">Image files must be image type and 5MB or smaller. Pasted image URL must be valid.</p>{!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}</div><button onClick={saveBusiness} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-black disabled:opacity-60">{saving ? "Saving..." : "Save Business"}</button></section>)}</div></main>
  );
}

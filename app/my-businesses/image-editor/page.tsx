"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../../components/MyHubHeader";
import SiteFooter from "../../components/SiteFooter";
import DirectoryImageCropper, { type DirectoryImageCrop } from "../../components/DirectoryImageCropper";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";
import { validateOptionalImageFile } from "../../lib/validation";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

async function upload(file: File) {
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

export default function BusinessImageEditorPage() {
  const site = useCurrentSite();
  const [business, setBusiness] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<DirectoryImageCrop>({ x: 50, y: 50, zoom: 1 });
  const [message, setMessage] = useState("Checking access...");
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, [site.id]);

  async function load() {
    const businessId = new URLSearchParams(window.location.search).get("business") || "";
    if (!businessId) return setMessage("Choose a business from the directory or My Businesses.");
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user) return setMessage("Please login to manage this business image.");
    const listing = await forSite(supabase.from("local_businesses").select("id,name,image,image_urls,image_position_x,image_position_y,image_zoom,created_by"), site.id).eq("id", businessId).maybeSingle();
    if (listing.error || !listing.data) return setMessage(listing.error?.message || "Business not found.");
    let allowed = listing.data.created_by === user.id;
    if (!allowed) {
      const manager = await forSite(supabase.from("business_managers").select("id"), site.id).eq("business_id", businessId).eq("user_id", user.id).eq("active", true).maybeSingle();
      allowed = Boolean(manager.data);
    }
    if (!allowed) return setMessage("You do not have permission to manage this business image.");
    setBusiness(listing.data);
    setCrop({ x: Number(listing.data.image_position_x ?? 50), y: Number(listing.data.image_position_y ?? 50), zoom: Number(listing.data.image_zoom ?? 1) });
    setMessage("");
  }

  async function save() {
    if (!business?.id) return;
    setSaving(true); setMessage("Saving image and card preview...");
    try {
      const imageUrl = file ? await upload(file) : String(business.image || business.image_urls?.[0] || "");
      if (!imageUrl) throw new Error("Choose an image first.");
      const existing = Array.isArray(business.image_urls) ? business.image_urls : [];
      const imageUrls = Array.from(new Set([imageUrl, ...existing]));
      const result = await forSite(supabase.from("local_businesses").update({ image: imageUrl, image_urls: imageUrls, image_position_x: crop.x, image_position_y: crop.y, image_zoom: crop.zoom, updated_at: new Date().toISOString() }), site.id).eq("id", business.id);
      if (result.error) throw result.error;
      setBusiness({ ...business, image: imageUrl, image_urls: imageUrls, image_position_x: crop.x, image_position_y: crop.y, image_zoom: crop.zoom });
      setFile(null); setMessage("Image and visible card area saved.");
    } catch (error: any) { setMessage(error?.message || "Could not save the image."); }
    finally { setSaving(false); }
  }

  const currentImage = business?.image || business?.image_urls?.[0] || "";
  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader/><section className="mx-auto max-w-5xl px-6 py-10"><a href="/my-businesses" className="font-black text-pink-300">← Back to My Businesses</a><h1 className="mt-3 text-4xl font-black">Business Image Preview</h1><p className="mt-2 text-slate-300">Keep every directory card the same size while choosing the most important part of your image.</p>{message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}{business && <div className="mt-6 rounded-3xl bg-white p-6 text-slate-950"><h2 className="mb-5 text-2xl font-black">{business.name}</h2><DirectoryImageCropper src={currentImage} value={crop} onChange={setCrop} onFileChange={setFile} label="Upload or replace business image"/><button onClick={save} disabled={saving} className="mt-6 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Image and Card Position"}</button></div>}</section><SiteFooter/></main>;
}

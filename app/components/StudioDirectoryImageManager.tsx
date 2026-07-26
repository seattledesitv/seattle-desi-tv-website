"use client";

import { useEffect, useState } from "react";
import DirectoryImageCropper, { type DirectoryImageCrop, type DirectoryImageMode } from "./DirectoryImageCropper";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { validateOptionalImageFile } from "../lib/validation";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

type Props = {
  table: "local_businesses" | "community_organizations";
  recordId: string;
  name: string;
  image?: string | null;
  imageUrls?: string[] | null;
  positionX?: number | null;
  positionY?: number | null;
  zoom?: number | null;
  displayMode?: DirectoryImageMode | null;
  folder: "businesses" | "organizations";
  onSaved?: () => void | Promise<void>;
};

async function upload(file: File, folder: string) {
  const validation = validateOptionalImageFile(file, "Directory image", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured.");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", `seattle-desi-tv/${folder}`);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Image upload failed.");
  return String(result.secure_url || "");
}

export default function StudioDirectoryImageManager({ table, recordId, name, image, imageUrls, positionX, positionY, zoom, displayMode, folder, onSaved }: Props) {
  const currentImage = image || imageUrls?.[0] || "";
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<DirectoryImageCrop>({ x: Number(positionX ?? 50), y: Number(positionY ?? 50), zoom: Number(zoom ?? 1), mode: displayMode || "cover" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFile(null);
    setCrop({ x: Number(positionX ?? 50), y: Number(positionY ?? 50), zoom: Number(zoom ?? 1), mode: displayMode || "cover" });
    setMessage("");
  }, [recordId, positionX, positionY, zoom, displayMode]);

  async function save() {
    setSaving(true); setMessage("Saving image presentation...");
    try {
      const imageUrl = file ? await upload(file, folder) : currentImage;
      if (!imageUrl) throw new Error("Choose an image first.");
      const urls = Array.from(new Set([imageUrl, ...(Array.isArray(imageUrls) ? imageUrls : [])]));
      const { error } = await supabase.from(table).update({ image: imageUrl, image_urls: urls, image_position_x: crop.x, image_position_y: crop.y, image_zoom: crop.zoom, image_display_mode: crop.mode, updated_at: new Date().toISOString() }).eq("id", recordId);
      if (error) throw error;
      setFile(null); setMessage("Image presentation saved for the public directory.");
      await onSaved?.();
    } catch (error: any) { setMessage(error?.message || "Could not save the image."); }
    finally { setSaving(false); }
  }

  return <section className="mt-5 rounded-2xl border border-pink-200 bg-pink-50/40 p-4">
    <div className="mb-4"><p className="text-xs font-black uppercase tracking-wide text-pink-600">Public directory media</p><h3 className="text-xl font-black">Image and visible card area</h3><p className="mt-1 text-sm text-slate-600">Choose Fill frame for photos, or Show full image for logos such as Apna Bazar.</p></div>
    <DirectoryImageCropper src={currentImage} value={crop} onChange={setCrop} onFileChange={setFile} label="Upload or replace image" />
    {message && <div className="mt-4 rounded-xl bg-white p-3 text-sm font-bold text-slate-700">{message}</div>}
    <button type="button" onClick={save} disabled={saving} className="mt-4 w-full rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Image Presentation"}</button>
  </section>;
}

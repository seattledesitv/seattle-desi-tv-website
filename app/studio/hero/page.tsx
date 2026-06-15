"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { uploadFileToCloudinary } from "../../lib/cloudinaryUpload";
import { firstError, requireText, validateOptionalUrl } from "../../lib/validation";

const supabase = getSupabaseBrowserClient();
const emptyBanner = { title: "", subtitle: "", image_url: "", button_text: "", button_url: "", banner_type: "marketing", start_date: "", end_date: "", display_order: 0, active: true };
const emptyFestival = { festival_name: "", festival_key: "", title: "", subtitle: "", image_url: "", start_date: "", end_date: "", active: true };

type FieldProps = { label: string; required?: boolean; help?: string; children: React.ReactNode };
function Field({ label, required, help, children }: FieldProps) {
  return <label className="block text-sm font-bold text-slate-900 mb-3"><span>{label}{required && <span className="text-pink-600"> *</span>}</span>{children}{help && <p className="text-xs text-gray-500 mt-1 font-normal">{help}</p>}</label>;
}
function normalizeDate(value: string | null | undefined) { return value ? String(value).split("T")[0] : ""; }

export default function HeroCmsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [banners, setBanners] = useState<any[]>([]);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [bannerForm, setBannerForm] = useState<any>(emptyBanner);
  const [festivalForm, setFestivalForm] = useState<any>(emptyFestival);
  const [editingBannerId, setEditingBannerId] = useState("");
  const [editingFestivalId, setEditingFestivalId] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [festivalFile, setFestivalFile] = useState<File | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingFestival, setUploadingFestival] = useState(false);
  const canAccess = Boolean(user && isAdminRole(role));

  async function loadContent() {
    const [bannerResult, festivalResult] = await Promise.all([
      supabase.from("homepage_hero_banners").select("id,title,subtitle,image_url,button_text,button_url,banner_type,start_date,end_date,display_order,active").order("display_order", { ascending: true }),
      supabase.from("festival_hero_assets").select("id,festival_name,festival_key,title,subtitle,image_url,start_date,end_date,active").order("start_date", { ascending: true }),
    ]);
    if (bannerResult.error) setMessage(`Could not load banners: ${bannerResult.error.message}`); else setBanners(bannerResult.data || []);
    if (festivalResult.error) setMessage(`Could not load festivals: ${festivalResult.error.message}`); else setFestivals(festivalResult.data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage hero banners."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This page is for admins only."); setLoading(false); return; }
    await loadContent();
    setMessage("");
    setLoading(false);
  }

  function resetBannerForm() { setBannerForm(emptyBanner); setBannerFile(null); setEditingBannerId(""); }
  function resetFestivalForm() { setFestivalForm(emptyFestival); setFestivalFile(null); setEditingFestivalId(""); }

  function editBanner(banner: any) {
    setEditingBannerId(banner.id); setBannerFile(null);
    setBannerForm({ title: banner.title || "", subtitle: banner.subtitle || "", image_url: banner.image_url || "", button_text: banner.button_text || "", button_url: banner.button_url || "", banner_type: banner.banner_type || "marketing", start_date: normalizeDate(banner.start_date), end_date: normalizeDate(banner.end_date), display_order: Number(banner.display_order || 0), active: banner.active !== false });
    setMessage(`Editing marketing banner: ${banner.title || "Untitled"}`);
  }

  function editFestival(festival: any) {
    setEditingFestivalId(festival.id); setFestivalFile(null);
    setFestivalForm({ festival_name: festival.festival_name || "", festival_key: festival.festival_key || "", title: festival.title || "", subtitle: festival.subtitle || "", image_url: festival.image_url || "", start_date: normalizeDate(festival.start_date), end_date: normalizeDate(festival.end_date), active: festival.active !== false });
    setMessage(`Editing festival asset: ${festival.festival_name || "Untitled"}`);
  }

  async function uploadBannerImage() {
    if (!bannerFile) { setMessage("Choose a banner image first."); return; }
    try { setUploadingBanner(true); const imageUrl = await uploadFileToCloudinary(bannerFile); setBannerForm((current: any) => ({ ...current, image_url: imageUrl })); setMessage("Banner image uploaded. You can now save the banner."); }
    catch (error: any) { setMessage(error?.message || "Banner image upload failed."); }
    finally { setUploadingBanner(false); }
  }

  async function uploadFestivalImage() {
    if (!festivalFile) { setMessage("Choose a festival image first."); return; }
    try { setUploadingFestival(true); const imageUrl = await uploadFileToCloudinary(festivalFile); setFestivalForm((current: any) => ({ ...current, image_url: imageUrl })); setMessage("Festival image uploaded. You can now save the festival."); }
    catch (error: any) { setMessage(error?.message || "Festival image upload failed."); }
    finally { setUploadingFestival(false); }
  }

  async function saveBanner() {
    const validationError = firstError(requireText(bannerForm.title, "Banner title", 2), validateOptionalUrl(bannerForm.image_url, "Banner image URL"), validateOptionalUrl(bannerForm.button_url, "Button URL"));
    if (validationError) { setMessage(validationError); return; }
    try {
      setUploadingBanner(true);
      let imageUrl = bannerForm.image_url || "";
      if (bannerFile && !imageUrl) { setMessage("Uploading banner image before saving..."); imageUrl = await uploadFileToCloudinary(bannerFile); }
      const payload: any = { ...bannerForm, image_url: imageUrl, start_date: bannerForm.start_date || null, end_date: bannerForm.end_date || null, display_order: Number(bannerForm.display_order || 0), updated_at: new Date().toISOString() };
      const result = editingBannerId ? await supabase.from("homepage_hero_banners").update(payload).eq("id", editingBannerId) : await supabase.from("homepage_hero_banners").insert(payload);
      if (result.error) { setMessage(`Save failed: ${result.error.message}`); return; }
      const wasEditing = Boolean(editingBannerId); resetBannerForm(); setMessage(wasEditing ? "Hero banner updated." : "Hero banner saved with image."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Banner save failed."); }
    finally { setUploadingBanner(false); }
  }

  async function saveFestival() {
    const validationError = firstError(requireText(festivalForm.festival_name, "Festival name", 2), requireText(festivalForm.festival_key, "Festival key", 2), requireText(festivalForm.start_date, "Start date", 1), requireText(festivalForm.end_date, "End date", 1), validateOptionalUrl(festivalForm.image_url, "Festival image URL"));
    if (validationError) { setMessage(validationError); return; }
    try {
      setUploadingFestival(true);
      let imageUrl = festivalForm.image_url || "";
      if (festivalFile && !imageUrl) { setMessage("Uploading festival image before saving..."); imageUrl = await uploadFileToCloudinary(festivalFile); }
      const payload: any = { ...festivalForm, image_url: imageUrl, updated_at: new Date().toISOString() };
      const result = editingFestivalId ? await supabase.from("festival_hero_assets").update(payload).eq("id", editingFestivalId) : await supabase.from("festival_hero_assets").insert(payload);
      if (result.error) { setMessage(`Festival save failed: ${result.error.message}`); return; }
      const wasEditing = Boolean(editingFestivalId); resetFestivalForm(); setMessage(wasEditing ? "Festival hero updated." : "Festival hero saved with image."); await loadContent();
    } catch (error: any) { setMessage(error?.message || "Festival save failed."); }
    finally { setUploadingFestival(false); }
  }

  async function toggle(table: string, item: any) { const { error } = await supabase.from(table).update({ active: !item.active, updated_at: new Date().toISOString() }).eq("id", item.id); if (error) setMessage(`Update failed: ${error.message}`); else { setMessage("Status updated."); await loadContent(); } }
  async function deleteItem(table: string, id: string, label: string) { const confirmed = window.confirm(`Delete ${label}? This cannot be undone.`); if (!confirmed) return; const { error } = await supabase.from(table).delete().eq("id", id); if (error) setMessage(`Delete failed: ${error.message}`); else { setMessage(`${label} deleted.`); await loadContent(); } }
  async function duplicateBanner(banner: any) { const payload: any = { title: `${banner.title || "Untitled"} Copy`, subtitle: banner.subtitle || "", image_url: banner.image_url || "", button_text: banner.button_text || "", button_url: banner.button_url || "", banner_type: banner.banner_type || "marketing", start_date: banner.start_date || null, end_date: banner.end_date || null, display_order: Number(banner.display_order || 0) + 1, active: false, updated_at: new Date().toISOString() }; const { error } = await supabase.from("homepage_hero_banners").insert(payload); if (error) setMessage(`Duplicate failed: ${error.message}`); else { setMessage("Banner duplicated as inactive copy."); await loadContent(); } }
  async function duplicateFestival(festival: any) { const payload: any = { festival_name: `${festival.festival_name || "Festival"} Copy`, festival_key: `${festival.festival_key || "festival"}_copy_${Date.now()}`, title: festival.title || "", subtitle: festival.subtitle || "", image_url: festival.image_url || "", start_date: festival.start_date || null, end_date: festival.end_date || null, active: false, updated_at: new Date().toISOString() }; const { error } = await supabase.from("festival_hero_assets").insert(payload); if (error) setMessage(`Duplicate failed: ${error.message}`); else { setMessage("Festival duplicated as inactive copy."); await loadContent(); } }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><h1 className="text-4xl font-black">Hero CMS</h1><p className="text-slate-300 mt-2">Manage rotating homepage hero banners and festival hero assets.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role}</p>}{loading && <div className="bg-white/10 rounded-2xl p-6 mt-8">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 mt-8">{message}</div>}{!loading && canAccess && <div className="space-y-8 mt-8">{message && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{message}</div>}<section className="grid xl:grid-cols-[460px_1fr] gap-6"><div className="bg-white text-slate-950 rounded-2xl p-6"><div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-2xl font-black">{editingBannerId ? "Edit Marketing Banner" : "Add Marketing Banner"}</h2>{editingBannerId && <button onClick={resetBannerForm} className="border px-3 py-2 rounded-lg font-bold text-sm">Cancel</button>}</div><Field label="Banner Title" required><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Main hero headline" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} /></Field><Field label="Banner Subtitle"><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Short supporting text" value={bannerForm.subtitle} onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })} /></Field><div className="border rounded-xl p-4 mb-3 bg-slate-50"><p className="font-black text-sm mb-2">Upload Banner Image</p><input type="file" accept="image/*" onChange={(e) => { setBannerFile(e.target.files?.[0] || null); setBannerForm({ ...bannerForm, image_url: "" }); }} className="w-full text-sm mb-3" /><button type="button" onClick={uploadBannerImage} disabled={!bannerFile || uploadingBanner} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50">{uploadingBanner ? "Uploading..." : "Upload Now / Preview"}</button><p className="text-xs text-gray-500 mt-2">Upload an image, or paste a valid image URL below.</p></div><Field label="Banner Image URL" help="Optional override. Must be a valid web URL if entered."><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="https://..." value={bannerForm.image_url} onChange={(e) => setBannerForm({ ...bannerForm, image_url: e.target.value })} /></Field>{bannerForm.image_url && <img src={bannerForm.image_url} alt="Banner preview" className="w-full h-48 object-cover rounded-xl border mb-3" />}<Field label="Button Text"><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Example: Learn More" value={bannerForm.button_text} onChange={(e) => setBannerForm({ ...bannerForm, button_text: e.target.value })} /></Field><Field label="Button URL" help="Optional. Must be a valid URL if entered."><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="https://... or /events" value={bannerForm.button_url} onChange={(e) => setBannerForm({ ...bannerForm, button_url: e.target.value })} /></Field><Field label="Banner Type"><select className="w-full border rounded-lg p-3 mt-1 font-normal" value={bannerForm.banner_type} onChange={(e) => setBannerForm({ ...bannerForm, banner_type: e.target.value })}><option>marketing</option><option>event</option><option>sponsor</option><option>radio</option><option>announcement</option></select></Field><Field label="Start Date"><input className="w-full border rounded-lg p-3 mt-1 font-normal" type="date" value={bannerForm.start_date} onChange={(e) => setBannerForm({ ...bannerForm, start_date: e.target.value })} /></Field><Field label="End Date"><input className="w-full border rounded-lg p-3 mt-1 font-normal" type="date" value={bannerForm.end_date} onChange={(e) => setBannerForm({ ...bannerForm, end_date: e.target.value })} /></Field><Field label="Display Order"><input className="w-full border rounded-lg p-3 mt-1 font-normal" type="number" value={bannerForm.display_order} onChange={(e) => setBannerForm({ ...bannerForm, display_order: Number(e.target.value) })} /></Field><label className="flex gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={bannerForm.active} onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })} /> Active</label><button onClick={saveBanner} disabled={uploadingBanner} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black disabled:opacity-50">{uploadingBanner ? "Saving..." : editingBannerId ? "Update Banner" : "Save Banner"}</button></div><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Hero Banners ({banners.length})</h2><div className="grid gap-4">{banners.map((banner) => <article key={banner.id} className="border rounded-xl p-4 grid md:grid-cols-[120px_1fr_auto] gap-4 items-center">{banner.image_url ? <img src={banner.image_url} alt={banner.title} className="w-28 h-20 rounded-xl object-cover bg-gray-50 border" /> : <div className="w-28 h-20 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h3 className="text-xl font-black">{banner.title}</h3><p className="text-sm text-gray-600">{banner.banner_type} · Order {banner.display_order || 0} · {banner.active ? "Active" : "Inactive"}</p><p className="text-xs text-gray-500 break-all">{banner.image_url || "No image URL saved"}</p><p className="text-xs text-gray-500">{banner.start_date || "No start"} → {banner.end_date || "No end"}</p></div><div className="flex flex-wrap gap-2 justify-end"><button onClick={() => editBanner(banner)} className="bg-slate-950 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</button><button onClick={() => duplicateBanner(banner)} className="border px-3 py-2 rounded-lg font-bold text-sm">Duplicate</button><button onClick={() => toggle("homepage_hero_banners", banner)} className="border px-3 py-2 rounded-lg font-bold text-sm">{banner.active ? "Deactivate" : "Activate"}</button><button onClick={() => deleteItem("homepage_hero_banners", banner.id, banner.title || "banner")} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button></div></article>)}{banners.length === 0 && <p className="text-gray-500">No banners found.</p>}</div></div></section><section className="grid xl:grid-cols-[460px_1fr] gap-6"><div className="bg-white text-slate-950 rounded-2xl p-6"><div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-2xl font-black">{editingFestivalId ? "Edit Festival Hero" : "Add Festival Hero"}</h2>{editingFestivalId && <button onClick={resetFestivalForm} className="border px-3 py-2 rounded-lg font-bold text-sm">Cancel</button>}</div><Field label="Festival Name" required><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Example: Diwali" value={festivalForm.festival_name} onChange={(e) => setFestivalForm({ ...festivalForm, festival_name: e.target.value })} /></Field><Field label="Festival Key" required help="Use lowercase letters, numbers, and underscores. Example: diwali_2026"><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="diwali_2026" value={festivalForm.festival_key} onChange={(e) => setFestivalForm({ ...festivalForm, festival_key: e.target.value })} /></Field><Field label="Festival Title"><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Headline shown on hero" value={festivalForm.title} onChange={(e) => setFestivalForm({ ...festivalForm, title: e.target.value })} /></Field><Field label="Festival Subtitle"><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="Short supporting text" value={festivalForm.subtitle} onChange={(e) => setFestivalForm({ ...festivalForm, subtitle: e.target.value })} /></Field><div className="border rounded-xl p-4 mb-3 bg-slate-50"><p className="font-black text-sm mb-2">Upload Festival Image</p><input type="file" accept="image/*" onChange={(e) => { setFestivalFile(e.target.files?.[0] || null); setFestivalForm({ ...festivalForm, image_url: "" }); }} className="w-full text-sm mb-3" /><button type="button" onClick={uploadFestivalImage} disabled={!festivalFile || uploadingFestival} className="w-full bg-slate-950 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-50">{uploadingFestival ? "Uploading..." : "Upload Now / Preview"}</button><p className="text-xs text-gray-500 mt-2">Upload an image, or paste a valid image URL below.</p></div><Field label="Festival Image URL" help="Optional override. Must be a valid web URL if entered."><input className="w-full border rounded-lg p-3 mt-1 font-normal" placeholder="https://..." value={festivalForm.image_url} onChange={(e) => setFestivalForm({ ...festivalForm, image_url: e.target.value })} /></Field>{festivalForm.image_url && <img src={festivalForm.image_url} alt="Festival preview" className="w-full h-48 object-cover rounded-xl border mb-3" />}<Field label="Start Date" required><input className="w-full border rounded-lg p-3 mt-1 font-normal" type="date" value={festivalForm.start_date} onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })} /></Field><Field label="End Date" required><input className="w-full border rounded-lg p-3 mt-1 font-normal" type="date" value={festivalForm.end_date} onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })} /></Field><label className="flex gap-2 text-sm font-bold mb-4"><input type="checkbox" checked={festivalForm.active} onChange={(e) => setFestivalForm({ ...festivalForm, active: e.target.checked })} /> Active</label><button onClick={saveFestival} disabled={uploadingFestival} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black disabled:opacity-50">{uploadingFestival ? "Saving..." : editingFestivalId ? "Update Festival" : "Save Festival"}</button></div><div className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Festival Assets ({festivals.length})</h2><div className="grid gap-4">{festivals.map((festival) => <article key={festival.id} className="border rounded-xl p-4 grid md:grid-cols-[120px_1fr_auto] gap-4 items-center">{festival.image_url ? <img src={festival.image_url} alt={festival.festival_name} className="w-28 h-20 rounded-xl object-cover bg-gray-50 border" /> : <div className="w-28 h-20 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs">No image</div>}<div><h3 className="text-xl font-black">{festival.festival_name}</h3><p className="text-sm text-gray-600">{festival.festival_key} · {festival.active ? "Active" : "Inactive"}</p><p className="text-xs text-gray-500 break-all">{festival.image_url || "No image URL saved"}</p><p className="text-xs text-gray-500">{festival.start_date} → {festival.end_date}</p></div><div className="flex flex-wrap gap-2 justify-end"><button onClick={() => editFestival(festival)} className="bg-slate-950 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</button><button onClick={() => duplicateFestival(festival)} className="border px-3 py-2 rounded-lg font-bold text-sm">Duplicate</button><button onClick={() => toggle("festival_hero_assets", festival)} className="border px-3 py-2 rounded-lg font-bold text-sm">{festival.active ? "Deactivate" : "Activate"}</button><button onClick={() => deleteItem("festival_hero_assets", festival.id, festival.festival_name || "festival")} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button></div></article>)}{festivals.length === 0 && <p className="text-gray-500">No festival assets found.</p>}</div></div></section></div>}</div></main>
  );
}

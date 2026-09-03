"use client";

import { useEffect, useMemo, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import DirectoryImageCropper, { type DirectoryImageCrop, type DirectoryImageMode } from "../components/DirectoryImageCropper";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { useCurrentSite } from "../lib/sites/SiteContext";
import { forSite } from "../lib/sites/query";
import { validateOptionalImageFile } from "../lib/validation";

const supabase = getSupabaseBrowserClient();
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

type OrganizationRow = {
  id: string;
  name: string;
  organization_type?: string | null;
  category?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  image?: string | null;
  image_position_x?: number | null;
  image_position_y?: number | null;
  image_zoom?: number | null;
  image_display_mode?: DirectoryImageMode | null;
  status?: string | null;
  submitted_by?: string | null;
  manager_role?: string | null;
  access_type?: "submitted" | "managed";
  manager_verified_at?: string | null;
  updated_at?: string | null;
};

type OrganizationStats = { pendingSuggestions: number; linkedEvents: number; upcomingEvents: number };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-black text-slate-800"><span>{label}</span>{children}</label>;
}

function statusText(value?: string | null) {
  const text = String(value || "pending").replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateText(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function health(row: OrganizationRow, stats: OrganizationStats) {
  const checks = [
    { label: "Organization name", done: Boolean(row.name), points: 5, action: "general" as const },
    { label: "Description", done: Boolean(row.description?.trim()), points: 15, action: "general" as const },
    { label: "Category", done: Boolean(row.category?.trim()), points: 10, action: "general" as const },
    { label: "Location", done: Boolean(row.location?.trim()), points: 5, action: "general" as const },
    { label: "Website", done: Boolean(row.website?.trim()), points: 10, action: "general" as const },
    { label: "Contact name", done: Boolean(row.contact_name?.trim()), points: 5, action: "general" as const },
    { label: "Contact email", done: Boolean(row.contact_email?.trim()), points: 10, action: "general" as const },
    { label: "Contact phone", done: Boolean(row.contact_phone?.trim()), points: 5, action: "general" as const },
    { label: "Cover image", done: Boolean(row.image), points: 20, action: "media" as const },
    { label: "Verified manager", done: Boolean(row.manager_verified_at || row.access_type === "managed"), points: 10, action: "general" as const },
    { label: "Linked event", done: stats.linkedEvents > 0, points: 5, action: "events" as const },
  ];
  return { checks, score: checks.reduce((sum, item) => sum + (item.done ? item.points : 0), 0) };
}

async function uploadOrganizationImage(file: File) {
  const validation = validateOptionalImageFile(file, "Organization image", 5);
  if (!validation.ok) throw new Error(validation.message);
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Cloudinary is not configured.");
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "seattle-desi-tv/organizations");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Image upload failed.");
  return String(result.secure_url || "");
}

function ImagePreview({ row }: { row: OrganizationRow }) {
  if (!row.image) return <div className="mt-6 grid aspect-[16/9] place-items-center rounded-2xl border bg-slate-100 text-center"><div><p className="text-4xl font-black text-pink-500">{row.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</p><p className="mt-2 text-sm font-bold text-slate-500">Organization image coming soon</p></div></div>;
  const mode = row.image_display_mode || "cover";
  return <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl border bg-white">
    {mode === "blur" && <img src={row.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-55" />}
    <img src={row.image} alt={row.name} className={mode === "cover" ? "h-full w-full object-cover" : "relative z-10 h-full w-full object-contain p-3"} style={mode === "cover" ? { objectPosition: `${row.image_position_x ?? 50}% ${row.image_position_y ?? 50}%`, transform: `scale(${row.image_zoom ?? 1})`, transformOrigin: `${row.image_position_x ?? 50}% ${row.image_position_y ?? 50}%` } : undefined} />
  </div>;
}

export default function MyOrganizationsPage() {
  const site = useCurrentSite();
  const [rows, setRows] = useState<OrganizationRow[]>([]);
  const [stats, setStats] = useState<Record<string, OrganizationStats>>({});
  const [message, setMessage] = useState("Loading...");
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"general" | "media">("general");
  const [form, setForm] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState<DirectoryImageCrop>({ x: 50, y: 50, zoom: 1, mode: "cover" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function loadRows() {
    const { data: auth } = await supabase.auth.getUser();
    const currentUser = auth?.user || null;
    if (!currentUser?.id) { setMessage("Please login to view organizations you submitted or manage."); return; }
    const columns = "id,name,organization_type,category,location,website,description,contact_name,contact_email,contact_phone,image,image_position_x,image_position_y,image_zoom,image_display_mode,status,submitted_by,manager_verified_at,updated_at";
    const [submitted, managed] = await Promise.all([
      forSite(supabase.from("community_organizations").select(columns), site.id).eq("submitted_by", currentUser.id).order("created_at", { ascending: false }),
      forSite(supabase.from("organization_managers").select(`role,is_primary,community_organizations(${columns})`), site.id).eq("user_id", currentUser.id).eq("active", true)
    ]);
    if (submitted.error) { setMessage(submitted.error.message); return; }
    const map = new Map<string, OrganizationRow>();
    (submitted.data || []).forEach((row: any) => map.set(row.id, { ...row, access_type: "submitted" }));
    if (!managed.error) (managed.data || []).forEach((manager: any) => { const organization = manager.community_organizations; if (organization) map.set(organization.id, { ...organization, access_type: "managed", manager_role: manager.role }); });
    const next = Array.from(map.values());
    setRows(next);
    setSelectedId((current) => current && next.some((row) => row.id === current) ? current : next[0]?.id || "");

    const nextStats: Record<string, OrganizationStats> = {};
    await Promise.all(next.map(async (row) => {
      const [suggestions, links] = await Promise.all([
        forSite(supabase.from("organization_edit_suggestions").select("id", { count: "exact", head: true }), site.id).eq("organization_id", row.id).eq("status", "pending"),
        forSite(supabase.from("event_organizations").select("events(date,status,approved)"), site.id).eq("organization_id", row.id)
      ]);
      const today = new Date().toISOString().split("T")[0];
      const approvedLinks = (links.data || []).filter((link: any) => link.events?.approved || link.events?.status === "approved");
      nextStats[row.id] = { pendingSuggestions: suggestions.error ? 0 : suggestions.count || 0, linkedEvents: approvedLinks.length, upcomingEvents: approvedLinks.filter((link: any) => String(link.events?.date || "") >= today).length };
    }));
    setStats(nextStats);
    setMessage(managed.error ? `Submitted organizations loaded, but manager access could not be loaded: ${managed.error.message}` : "Manage profile quality, public information and organization activity from one place.");
  }

  useEffect(() => { void loadRows(); }, [site.id]);

  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return rows.filter((row) => !q || [row.name,row.category,row.organization_type,row.location,row.website,row.contact_name,row.contact_email,row.manager_role].some((value) => String(value || "").toLowerCase().includes(q))); }, [rows, search]);
  const selected = rows.find((row) => row.id === selectedId) || filtered[0] || null;
  const selectedStats = selected ? stats[selected.id] || { pendingSuggestions: 0, linkedEvents: 0, upcomingEvents: 0 } : { pendingSuggestions: 0, linkedEvents: 0, upcomingEvents: 0 };
  const selectedHealth = selected ? health(selected, selectedStats) : null;

  function startEdit(row: OrganizationRow, nextTab: "general" | "media" = "general") {
    setSelectedId(row.id); setEditing(true); setTab(nextTab); setFile(null);
    setCrop({ x: Number(row.image_position_x ?? 50), y: Number(row.image_position_y ?? 50), zoom: Number(row.image_zoom ?? 1), mode: row.image_display_mode || "cover" });
    setForm({ name: row.name || "", organization_type: row.organization_type || "", category: row.category || "", location: row.location || "", website: row.website || "", description: row.description || "", contact_name: row.contact_name || "", contact_email: row.contact_email || "", contact_phone: row.contact_phone || "" });
  }

  async function copyLink(row: OrganizationRow) {
    const url = `${window.location.origin}/community-organizations/${row.id}`;
    await navigator.clipboard.writeText(url);
    setMessage("Public organization link copied.");
  }

  async function share(row: OrganizationRow) {
    const url = `${window.location.origin}/community-organizations/${row.id}`;
    if (navigator.share) await navigator.share({ title: row.name, text: `View ${row.name} on Seattle Desi TV`, url });
    else await copyLink(row);
  }

  async function saveGeneral(row: OrganizationRow) {
    setSaving(true); setMessage("");
    const payload = { name: form.name?.trim(), organization_type: form.organization_type?.trim() || null, category: form.category?.trim() || null, location: form.location?.trim(), website: form.website?.trim() || null, description: form.description?.trim() || null, contact_name: form.contact_name?.trim() || null, contact_email: form.contact_email?.trim() || null, contact_phone: form.contact_phone?.trim() || null, updated_at: new Date().toISOString() };
    if (!payload.name || !payload.location) { setMessage("Organization name and location are required."); setSaving(false); return; }
    const result = await forSite(supabase.from("community_organizations").update(payload), site.id).eq("id", row.id);
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setMessage("Organization profile updated."); setEditing(false); await loadRows();
  }

  async function saveMedia(row: OrganizationRow) {
    setSaving(true); setMessage("Saving organization image...");
    try {
      const image = file ? await uploadOrganizationImage(file) : row.image || "";
      if (!image) throw new Error("Choose an image first.");
      const result = await forSite(supabase.from("community_organizations").update({ image, image_position_x: crop.x, image_position_y: crop.y, image_zoom: crop.zoom, image_display_mode: crop.mode || "cover", updated_at: new Date().toISOString() }), site.id).eq("id", row.id);
      if (result.error) throw result.error;
      setFile(null); setMessage("Organization image presentation saved."); setEditing(false); await loadRows();
    } catch (error: any) { setMessage(error?.message || "Could not save the organization image."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader/><section className="mx-auto max-w-7xl px-6 py-10">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="font-black uppercase tracking-wide text-pink-300">My Hub</p><h1 className="mt-2 text-4xl font-black md:text-5xl">My Organizations</h1><p className="mt-2 text-slate-300">{message}</p></div><div className="flex flex-wrap gap-3"><a href="/my-organizations/ticketing" className="rounded-xl bg-pink-600 px-5 py-3 text-center font-black">Event Ticketing</a><a href="/community-organizations" className="rounded-xl bg-white px-5 py-3 text-center font-black text-slate-950">Organization Directory</a></div></div>
    <section className="mb-6 rounded-3xl bg-white/10 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your organizations..." className="w-full rounded-xl bg-white px-4 py-3 font-bold text-slate-950" /></section>
    {rows.length === 0 ? <div className="rounded-3xl bg-white p-8 text-slate-950">No submitted or managed organizations found.</div> : <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <aside className="grid h-fit max-h-[78vh] gap-4 overflow-y-auto">{filtered.map((row) => { const rowStats = stats[row.id] || { pendingSuggestions: 0, linkedEvents: 0, upcomingEvents: 0 }; const score = health(row, rowStats).score; return <button key={row.id} onClick={() => { setSelectedId(row.id); setEditing(false); }} className={`rounded-3xl border p-4 text-left text-slate-950 ${selected?.id === row.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black">{row.name}</h2><span className="rounded-full bg-pink-50 px-2 py-1 text-[11px] font-black text-pink-600">{score}%</span></div><p className="mt-2 text-sm text-slate-600">{row.category || row.organization_type || "Organization"} · {row.location || "Seattle Area"}</p><p className="mt-2 text-xs font-black uppercase text-emerald-700">{row.access_type === "managed" ? `Verified manager · ${row.manager_role || "representative"}` : "Submitted by you"}</p></button>; })}</aside>
      <section className="min-h-[620px] rounded-[2rem] bg-white p-6 text-slate-950 shadow-2xl">
        {!selected ? <p>Select an organization.</p> : editing ? <div className="grid gap-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-pink-600">Manage organization</p><h2 className="text-3xl font-black">{selected.name}</h2></div><button onClick={() => setEditing(false)} className="rounded-xl bg-slate-100 px-4 py-3 font-black">Cancel</button></div><div className="flex gap-2 border-b pb-3"><button onClick={() => setTab("general")} className={`rounded-xl px-4 py-2 font-black ${tab === "general" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>General</button><button onClick={() => setTab("media")} className={`rounded-xl px-4 py-2 font-black ${tab === "media" ? "bg-pink-600 text-white" : "bg-slate-100"}`}>Media</button></div>{tab === "general" ? <><div className="grid gap-4 md:grid-cols-2"><Field label="Organization name"><input className="rounded-xl border p-3 font-normal" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})}/></Field><Field label="Organization type"><input className="rounded-xl border p-3 font-normal" value={form.organization_type} onChange={(e) => setForm({...form,organization_type:e.target.value})}/></Field><Field label="Category"><input className="rounded-xl border p-3 font-normal" value={form.category} onChange={(e) => setForm({...form,category:e.target.value})}/></Field><Field label="Location"><input className="rounded-xl border p-3 font-normal" value={form.location} onChange={(e) => setForm({...form,location:e.target.value})}/></Field><Field label="Website"><input className="rounded-xl border p-3 font-normal" value={form.website} onChange={(e) => setForm({...form,website:e.target.value})}/></Field><Field label="Contact name"><input className="rounded-xl border p-3 font-normal" value={form.contact_name} onChange={(e) => setForm({...form,contact_name:e.target.value})}/></Field><Field label="Contact email"><input className="rounded-xl border p-3 font-normal" value={form.contact_email} onChange={(e) => setForm({...form,contact_email:e.target.value})}/></Field><Field label="Contact phone"><input className="rounded-xl border p-3 font-normal" value={form.contact_phone} onChange={(e) => setForm({...form,contact_phone:e.target.value})}/></Field><Field label="Description"><textarea className="min-h-32 rounded-xl border p-3 font-normal md:col-span-2" value={form.description} onChange={(e) => setForm({...form,description:e.target.value})}/></Field></div><button onClick={() => saveGeneral(selected)} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Organization Profile"}</button></> : <><DirectoryImageCropper src={selected.image || ""} value={crop} onChange={setCrop} onFileChange={setFile} label="Upload or replace organization image"/><button onClick={() => saveMedia(selected)} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Image Presentation"}</button></>}</div> : <div>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-pink-600">{selected.access_type === "managed" ? "Verified organization manager" : "Organization submitted by you"}</p><h2 className="mt-1 text-3xl font-black">{selected.name}</h2><p className="mt-2 text-slate-500">{selected.organization_type || "Organization"} · {selected.category || "Community"} · {selected.location || "Seattle Area"}</p></div><span className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700">{selected.manager_verified_at || selected.access_type === "managed" ? "✓ Manager verified" : statusText(selected.status)}</span></div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-pink-50 p-4"><p className="text-xs font-black uppercase text-pink-600">Profile health</p><p className="mt-1 text-3xl font-black">{selectedHealth?.score || 0}%</p></div><div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Pending suggestions</p><p className="mt-1 text-3xl font-black">{selectedStats.pendingSuggestions}</p></div><div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Linked events</p><p className="mt-1 text-3xl font-black">{selectedStats.linkedEvents}</p></div><div className="rounded-2xl bg-slate-100 p-4"><p className="text-xs font-black uppercase text-slate-500">Upcoming events</p><p className="mt-1 text-3xl font-black">{selectedStats.upcomingEvents}</p></div></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-pink-600 transition-all" style={{ width: `${selectedHealth?.score || 0}%` }} /></div>
          <ImagePreview row={selected}/>
          <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-3xl border p-5"><h3 className="text-xl font-black">Organization setup</h3><div className="mt-4 grid gap-2">{selectedHealth?.checks.map((item) => <button key={item.label} onClick={() => item.action === "events" ? window.location.assign("/events?add=1") : startEdit(selected, item.action)} className={`flex items-center justify-between rounded-xl px-3 py-3 text-left font-bold ${item.done ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}><span>{item.done ? "✓" : "○"} {item.label}</span><span className="text-xs">{item.done ? "Complete" : "Add"}</span></button>)}</div></section><section className="rounded-3xl border p-5"><h3 className="text-xl font-black">Quick actions</h3><div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => startEdit(selected, "general")} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white">Edit Profile</button><button onClick={() => startEdit(selected, "media")} className="rounded-xl bg-slate-950 px-4 py-3 font-black text-white">Manage Image</button><a href={`/community-organizations/${selected.id}`} className="rounded-xl border px-4 py-3 text-center font-black">Public Profile</a><button onClick={() => copyLink(selected)} className="rounded-xl border px-4 py-3 font-black">Copy Link</button><button onClick={() => share(selected)} className="rounded-xl border px-4 py-3 font-black">Share</button><a href={`/community-organizations/suggest-update?organization=${selected.id}`} className="rounded-xl border px-4 py-3 text-center font-black">Suggest Update</a><a href="/events?add=1" className="rounded-xl border px-4 py-3 text-center font-black">Suggest Event</a><a href="/studio/organization-suggestions" className="rounded-xl border px-4 py-3 text-center font-black">View Suggestions</a></div><div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm"><p><b>Status:</b> {statusText(selected.status)}</p><p className="mt-1"><b>Last updated:</b> {dateText(selected.updated_at)}</p><p className="mt-1"><b>Manager role:</b> {selected.manager_role || (selected.access_type === "managed" ? "Authorized representative" : "Submitter")}</p></div></section></div>
          <p className="mt-6 whitespace-pre-line leading-7 text-slate-600">{selected.description || "No description provided."}</p>
        </div>}
      </section>
    </div>}
  </section><SiteFooter/></main>;
}

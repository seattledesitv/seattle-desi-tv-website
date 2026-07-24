"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const RELATIONSHIPS = ["Organizer", "Co-Organizer", "Community Partner", "Venue Partner", "Media Partner", "Sponsor", "Charity Partner", "Educational Partner"];
function roleContainsAdmin(role: string) { return String(role || "").toLowerCase().trim().includes("admin"); }
function isCrewAssignableRole(role: string) { const normalized = String(role || "").toLowerCase().trim(); return normalized === "team_member" || normalized.includes("admin"); }
function emptyForm() { return { title: "", date: "", location: "", description: "", image: "", ticket_url: "", poc_email: "", poc_phone: "", status: "pending", approved: false }; }
function getEventIdFromPath() { if (typeof window === "undefined") return ""; const parts = window.location.pathname.split("/").filter(Boolean); const last = parts[parts.length - 1] || ""; return last === "events" ? "" : last; }
function statusLabel(status?: string | null) { return String(status || "not_started").replaceAll("_", " "); }
function dateText(value?: string | null) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(); }

export default function EventEditPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [eventId, setEventId] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedCrewIds, setSelectedCrewIds] = useState<string[]>([]);
  const [videoWorkflow, setVideoWorkflow] = useState<any>(null);
  const [latestVideoRevision, setLatestVideoRevision] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [eventOrganizations, setEventOrganizations] = useState<any[]>([]);
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [newOrganization, setNewOrganization] = useState({ name: "", organization_type: "", category: "", location: "Seattle Area", website: "", description: "" });

  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
  const filteredOrganizations = useMemo(() => {
    const q = organizationSearch.trim().toLowerCase();
    const linked = new Set(eventOrganizations.map((item) => item.organization_id));
    return organizations.filter((organization) => !linked.has(organization.id) && (!q || `${organization.name} ${organization.organization_type || ""} ${organization.category || ""}`.toLowerCase().includes(q))).slice(0, 20);
  }, [organizations, eventOrganizations, organizationSearch]);

  async function loadTeamMembers() {
    const { data, error } = await supabase.from("admins").select("user_id,email,role,name").order("email", { ascending: true });
    if (error) { setActionMessage(`Could not load team members: ${error.message}`); return; }
    setTeamMembers((data || []).filter((member: any) => member.user_id && isCrewAssignableRole(member.role)));
  }

  async function loadOrganizations(id: string) {
    const [directoryResult, linksResult] = await Promise.all([
      supabase.from("community_organizations").select("id,name,organization_type,category,location,website,description").eq("approved", true).eq("status", "approved").order("name"),
      supabase.from("event_organizations").select("id,event_id,organization_id,relationship,display_order,is_primary,community_organizations(id,name,organization_type,category,location,website,description)").eq("event_id", id).order("display_order")
    ]);
    if (directoryResult.error) setActionMessage(`Could not load organizations: ${directoryResult.error.message}`);
    setOrganizations(directoryResult.data || []);
    setEventOrganizations(linksResult.data || []);
  }

  async function loadEvent(id: string) {
    if (!id) { setActionMessage("Could not load event: missing event id in URL."); return; }
    const { data, error } = await supabase.from("events").select("id,title,date,location,description,image,ticket_url,poc_email,poc_phone,status,approved,crew_member_ids").eq("id", id).maybeSingle();
    if (error) { setActionMessage(`Could not load event: ${error.message}`); return; }
    if (!data) { setActionMessage("Event not found."); return; }
    setForm({ title: data.title || "", date: data.date || "", location: data.location || "", description: data.description || "", image: data.image || "", ticket_url: data.ticket_url || "", poc_email: data.poc_email || "", poc_phone: data.poc_phone || "", status: data.status || "pending", approved: Boolean(data.approved) });
    setSelectedCrewIds(Array.isArray(data.crew_member_ids) ? data.crew_member_ids : []);
  }

  async function loadVideoWorkflow(id: string) {
    if (!id) return;
    const { data, error } = await supabase.from("event_video_workflows").select("id,status,assigned_editor_email,crew_reviewer_email,updated_at,published_at").eq("event_id", id).maybeSingle();
    if (error) { setVideoWorkflow(null); setLatestVideoRevision(null); return; }
    setVideoWorkflow(data || null);
    if (!data?.id) { setLatestVideoRevision(null); return; }
    const revisionResult = await supabase.from("event_video_revisions").select("id,revision_number,full_video_url,reel_url,created_at,submitted_by_email").eq("workflow_id", data.id).order("revision_number", { ascending: false }).limit(1).maybeSingle();
    setLatestVideoRevision(revisionResult.data || null);
  }

  async function init() {
    setLoading(true); setMessage("Checking access...");
    const idFromPath = getEventIdFromPath(); setEventId(idFromPath);
    const sessionResult = await supabase.auth.getSession(); const currentUser = sessionResult.data?.session?.user || null; setUser(currentUser);
    if (!currentUser) { setRole(""); setMessage("Please login to edit events."); setLoading(false); return; }
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    const nextRole = adminResult.data?.role || ""; setRole(nextRole);
    if (!roleContainsAdmin(nextRole)) { setMessage("You are logged in, but this account does not have admin access."); setLoading(false); return; }
    await Promise.all([loadEvent(idFromPath), loadTeamMembers(), loadVideoWorkflow(idFromPath), loadOrganizations(idFromPath)]); setMessage(""); setLoading(false);
  }

  function toggleCrewMember(userId: string) { setSelectedCrewIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]); }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!cloudinaryReady) { setActionMessage("Cloudinary is not configured. Image URL still works."); return; }
    setUploadingImage(true); setActionMessage("Uploading image...");
    try {
      const uploadForm = new FormData(); uploadForm.append("file", file); uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET); uploadForm.append("folder", "seattle-desi-tv/events");
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadForm }); const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");
      setForm((current) => ({ ...current, image: result.secure_url })); setActionMessage("Image uploaded. Save changes to keep it.");
    } catch (error: any) { setActionMessage(`Image upload failed: ${error?.message || String(error)}`); }
    finally { setUploadingImage(false); event.target.value = ""; }
  }

  async function addOrganization(organization: any) {
    const { error } = await supabase.from("event_organizations").insert({ event_id: eventId, organization_id: organization.id, relationship: eventOrganizations.length ? "Community Partner" : "Organizer", display_order: eventOrganizations.length, is_primary: eventOrganizations.length === 0, created_by: user?.id || null });
    if (error) { setActionMessage(`Could not link organization: ${error.message}`); return; }
    setOrganizationSearch(""); await loadOrganizations(eventId); setActionMessage(`${organization.name} linked to this event.`);
  }

  async function updateOrganizationLink(link: any, changes: any) {
    if (changes.is_primary) await supabase.from("event_organizations").update({ is_primary: false }).eq("event_id", eventId);
    const { error } = await supabase.from("event_organizations").update(changes).eq("id", link.id);
    if (error) { setActionMessage(`Could not update organization: ${error.message}`); return; }
    await loadOrganizations(eventId);
  }

  async function removeOrganizationLink(link: any) {
    const { error } = await supabase.from("event_organizations").delete().eq("id", link.id);
    if (error) { setActionMessage(`Could not remove organization: ${error.message}`); return; }
    await loadOrganizations(eventId);
  }

  async function createOrganizationInline() {
    if (!newOrganization.name.trim() || !newOrganization.category.trim() || !newOrganization.location.trim()) { setActionMessage("Organization name, category, and location are required."); return; }
    const { data, error } = await supabase.from("community_organizations").insert({ ...newOrganization, name: newOrganization.name.trim(), category: newOrganization.category.trim(), location: newOrganization.location.trim(), status: "approved", approved: true, approved_by: user?.email || user?.id, approved_at: new Date().toISOString(), submitted_by: user?.id, submitted_email: user?.email }).select("id,name,organization_type,category,location,website,description").single();
    if (error || !data) { setActionMessage(`Could not create organization: ${error?.message || "Unknown error"}`); return; }
    setOrganizations((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewOrganization({ name: "", organization_type: "", category: "", location: "Seattle Area", website: "", description: "" }); setShowQuickCreate(false); await addOrganization(data);
  }

  async function saveEvent() {
    if (!eventId) { setActionMessage("Save failed: missing event id in URL."); return; }
    if (!form.title.trim()) { setActionMessage("Event title is required."); return; }
    setSaving(true); setActionMessage("Saving event...");
    const approved = form.status === "approved" || form.approved;
    const payload: any = { title: form.title.trim(), date: form.date || null, location: form.location.trim(), description: form.description.trim(), image: form.image.trim(), ticket_url: form.ticket_url.trim(), poc_email: form.poc_email.trim(), poc_phone: form.poc_phone.trim(), status: form.status || "pending", approved, crew_member_ids: Array.from(new Set(selectedCrewIds)) };
    if (approved) { payload.approved_by = user?.email || user?.id || null; payload.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("events").update(payload).eq("id", eventId);
    if (error) { setActionMessage(`Save failed: ${error.message}`); setSaving(false); return; }
    setActionMessage("Event saved, including assigned crew and organization relationships."); setSaving(false);
  }

  useEffect(() => { init(); }, []);

  if (loading) return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><div className="mx-auto max-w-5xl rounded-2xl bg-white/10 p-6">{message}</div></main>;
  if (!canAccess) return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Access Required</h2><p className="mt-3 text-gray-600">{message}</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-bold text-white">Go to Login</a></div></main>;

  return <main className="min-h-screen bg-slate-950 px-6 py-10 text-white"><div className="mx-auto max-w-5xl"><a href="/studio/events" className="font-bold text-pink-300">← Back to Events</a><div className="mt-3 mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><h1 className="text-4xl font-black md:text-5xl">Edit Event</h1><p className="mt-2 text-slate-300">Logged in as {user?.email} · Role: {role}</p></div>{eventId && <a href={`/studio/events/${eventId}/coverage`} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Coverage Brief & Deliverables</a>}</div><div className="space-y-6">
    <section className="space-y-5 rounded-2xl bg-white p-6 text-slate-950">{actionMessage && <div className="rounded-xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}<div className="grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Event Title<input className="rounded-lg border p-3 font-normal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Date<input type="date" className="rounded-lg border p-3 font-normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Location<input className="rounded-lg border p-3 font-normal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold md:col-span-2">Description<textarea className="min-h-32 rounded-lg border p-3 font-normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Ticket URL<input className="rounded-lg border p-3 font-normal" value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">Status<select className="rounded-lg border p-3 font-normal" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, approved: e.target.value === "approved" })}><option value="pending">pending</option><option value="approved">approved</option><option value="on_hold">on_hold</option><option value="rejected">rejected</option></select></label><label className="grid gap-2 text-sm font-bold">POC Email<input className="rounded-lg border p-3 font-normal" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} /></label><label className="grid gap-2 text-sm font-bold">POC Phone<input className="rounded-lg border p-3 font-normal" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} /></label></div><div className="grid gap-2 text-sm font-bold">Image<input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="rounded-lg border p-3 font-normal" /><input className="rounded-lg border p-3 font-normal" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL" />{form.image && <img src={form.image} alt="Event preview" className="h-48 w-48 rounded-xl border object-cover" />}</div></section>

    <section className="rounded-2xl bg-white p-6 text-slate-950"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-black uppercase tracking-wide text-pink-600">Community Connections</p><h2 className="mt-1 text-2xl font-black">Organizations</h2><p className="mt-2 text-sm text-gray-600">Link organizers, co-hosts, sponsors, media partners, venues, and community partners.</p></div><button onClick={() => setShowQuickCreate(!showQuickCreate)} className="rounded-xl border border-pink-600 px-4 py-2 text-sm font-black text-pink-600">{showQuickCreate ? "Cancel" : "+ Create Organization"}</button></div>{showQuickCreate && <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-2"><input className="rounded-xl border p-3" placeholder="Organization name *" value={newOrganization.name} onChange={(e) => setNewOrganization({ ...newOrganization, name: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Organization type" value={newOrganization.organization_type} onChange={(e) => setNewOrganization({ ...newOrganization, organization_type: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Category *" value={newOrganization.category} onChange={(e) => setNewOrganization({ ...newOrganization, category: e.target.value })} /><input className="rounded-xl border p-3" placeholder="Location *" value={newOrganization.location} onChange={(e) => setNewOrganization({ ...newOrganization, location: e.target.value })} /><input className="rounded-xl border p-3 md:col-span-2" placeholder="Website" value={newOrganization.website} onChange={(e) => setNewOrganization({ ...newOrganization, website: e.target.value })} /><textarea className="min-h-24 rounded-xl border p-3 md:col-span-2" placeholder="Description" value={newOrganization.description} onChange={(e) => setNewOrganization({ ...newOrganization, description: e.target.value })} /><button onClick={createOrganizationInline} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white md:col-span-2">Create and Link Organization</button></div>}<div className="mt-5"><input className="w-full rounded-xl border p-3" placeholder="Search approved organizations..." value={organizationSearch} onChange={(e) => setOrganizationSearch(e.target.value)} />{organizationSearch && <div className="mt-2 max-h-64 overflow-auto rounded-xl border bg-white">{filteredOrganizations.map((organization) => <button key={organization.id} onClick={() => addOrganization(organization)} className="flex w-full items-start justify-between border-b p-3 text-left hover:bg-slate-50"><span><b>{organization.name}</b><span className="block text-xs text-gray-500">{organization.organization_type || organization.category} · {organization.location}</span></span><span className="font-black text-pink-600">Add</span></button>)}{filteredOrganizations.length === 0 && <p className="p-4 text-sm text-gray-500">No matching approved organization found.</p>}</div>}</div><div className="mt-5 space-y-3">{eventOrganizations.map((link, index) => { const organization = link.community_organizations; return <div key={link.id} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_210px_auto_auto] md:items-center"><div><p className="font-black">{organization?.name || "Organization"}</p><p className="text-xs text-gray-500">{organization?.organization_type || organization?.category || "Community organization"}</p></div><select className="rounded-xl border p-3 text-sm font-bold" value={link.relationship} onChange={(e) => updateOrganizationLink(link, { relationship: e.target.value })}>{RELATIONSHIPS.map((relationship) => <option key={relationship}>{relationship}</option>)}</select><label className="flex items-center gap-2 text-sm font-bold"><input type="radio" name="primaryOrganization" checked={Boolean(link.is_primary)} onChange={() => updateOrganizationLink(link, { is_primary: true })} /> Primary</label><button onClick={() => removeOrganizationLink(link)} className="rounded-xl border border-red-300 px-3 py-2 text-sm font-black text-red-600">Remove</button></div>; })}{eventOrganizations.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-gray-500">No organizations linked yet. Search above to add the organizer.</p>}</div></section>

    <section className="rounded-2xl bg-white p-6 text-slate-950"><h2 className="text-xl font-black">Assign SDTV Crew</h2><p className="mt-1 mb-4 text-sm text-gray-600">Private admin-only assignment. These names are not shown publicly.</p><div className="grid gap-3 md:grid-cols-2">{teamMembers.map((member) => <label key={member.user_id} className="flex items-center gap-3 rounded-xl border bg-white p-3 text-sm"><input type="checkbox" checked={selectedCrewIds.includes(member.user_id)} onChange={() => toggleCrewMember(member.user_id)} /><span><b>{member.name || member.email}</b><br /><span className="text-gray-500">{member.email} · {member.role}</span></span></label>)}</div><button onClick={saveEvent} disabled={saving || uploadingImage} className="mt-6 rounded-xl bg-pink-600 px-6 py-3 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Event"}</button></section>

    <section className="rounded-2xl bg-white p-6 text-slate-950"><div className="flex flex-col justify-between gap-4 md:flex-row"><div><p className="text-sm font-black uppercase tracking-wide text-pink-600">Video Production</p><h2 className="mt-1 text-2xl font-black">Video Production Status</h2></div><div className="flex flex-wrap gap-3">{eventId && <a href={`/studio/events/${eventId}/coverage`} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Coverage Brief</a>}{videoWorkflow?.id ? <a href={`/studio/video-production/${videoWorkflow.id}`} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Open Workflow</a> : <a href="/studio/video-production" className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Create Workflow</a>}</div></div>{videoWorkflow?.id ? <div className="mt-6 grid gap-4 text-sm md:grid-cols-2"><div className="rounded-2xl border bg-slate-50 p-4"><b>Status</b><p className="mt-1 font-black capitalize text-pink-600">{statusLabel(videoWorkflow.status)}</p></div><div className="rounded-2xl border bg-slate-50 p-4"><b>Updated</b><p className="mt-1 text-gray-700">{dateText(videoWorkflow.updated_at) || "Not available"}</p></div><div className="rounded-2xl border bg-slate-50 p-4"><b>Editor</b><p className="mt-1 text-gray-700">{videoWorkflow.assigned_editor_email || "Not assigned"}</p></div><div className="rounded-2xl border bg-slate-50 p-4"><b>Latest Revision</b><p className="mt-1 text-gray-700">{latestVideoRevision ? `Revision ${latestVideoRevision.revision_number}` : "No revision submitted"}</p></div></div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-bold text-gray-500">No video workflow has been created for this event.</p>}</section>
  </div></div></main>;
}

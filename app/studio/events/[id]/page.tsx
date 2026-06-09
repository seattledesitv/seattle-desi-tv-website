"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function isCrewAssignableRole(role: string) {
  const normalized = String(role || "").toLowerCase().trim();
  return normalized === "team_member" || normalized.includes("admin");
}

function emptyForm() {
  return {
    title: "",
    date: "",
    location: "",
    description: "",
    image: "",
    ticket_url: "",
    poc_email: "",
    poc_phone: "",
    status: "pending",
    approved: false,
  };
}

function getEventIdFromPath() {
  if (typeof window === "undefined") return "";
  const parts = window.location.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  return last === "events" ? "" : last;
}

function statusLabel(status?: string | null) {
  return String(status || "not_started").replaceAll("_", " ");
}

function dateText(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

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

  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

  async function loadTeamMembers() {
    const { data, error } = await supabase
      .from("admins")
      .select("user_id,email,role,name")
      .order("email", { ascending: true });

    if (error) {
      setActionMessage(`Could not load team members: ${error.message}`);
      return;
    }

    setTeamMembers((data || []).filter((member: any) => member.user_id && isCrewAssignableRole(member.role)));
  }

  async function loadEvent(id: string) {
    if (!id) {
      setActionMessage("Could not load event: missing event id in URL.");
      return;
    }

    const { data, error } = await supabase
      .from("events")
      .select("id,title,date,location,description,image,ticket_url,poc_email,poc_phone,status,approved,crew_member_ids")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      setActionMessage(`Could not load event: ${error.message}`);
      return;
    }

    if (!data) {
      setActionMessage("Event not found.");
      return;
    }

    setForm({
      title: data.title || "",
      date: data.date || "",
      location: data.location || "",
      description: data.description || "",
      image: data.image || "",
      ticket_url: data.ticket_url || "",
      poc_email: data.poc_email || "",
      poc_phone: data.poc_phone || "",
      status: data.status || "pending",
      approved: Boolean(data.approved),
    });
    setSelectedCrewIds(Array.isArray(data.crew_member_ids) ? data.crew_member_ids : []);
  }

  async function loadVideoWorkflow(id: string) {
    if (!id) return;
    const { data, error } = await supabase
      .from("event_video_workflows")
      .select("id,status,assigned_editor_email,crew_reviewer_email,raw_media_url,external_media_url,crew_notes,editor_notes,youtube_url,instagram_url,facebook_url,updated_at,published_at")
      .eq("event_id", id)
      .maybeSingle();

    if (error) {
      setVideoWorkflow(null);
      setLatestVideoRevision(null);
      return;
    }

    setVideoWorkflow(data || null);
    if (!data?.id) {
      setLatestVideoRevision(null);
      return;
    }

    const revisionResult = await supabase
      .from("event_video_revisions")
      .select("id,revision_number,full_video_url,reel_url,youtube_title,instagram_caption,feedback,created_at,submitted_by_email")
      .eq("workflow_id", data.id)
      .order("revision_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLatestVideoRevision(revisionResult.data || null);
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");
    const idFromPath = getEventIdFromPath();
    setEventId(idFromPath);

    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setMessage("Please login to edit events.");
      setLoading(false);
      return;
    }

    const adminResult = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .maybeSingle();

    const nextRole = adminResult.data?.role || "";
    setRole(nextRole);

    if (!roleContainsAdmin(nextRole)) {
      setMessage("You are logged in, but this account does not have admin access.");
      setLoading(false);
      return;
    }

    await Promise.all([loadEvent(idFromPath), loadTeamMembers(), loadVideoWorkflow(idFromPath)]);
    setMessage("");
    setLoading(false);
  }

  function toggleCrewMember(userId: string) {
    setSelectedCrewIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!cloudinaryReady) {
      setActionMessage("Cloudinary is not configured. Image URL still works.");
      return;
    }

    setUploadingImage(true);
    setActionMessage("Uploading image...");

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadForm.append("folder", "seattle-desi-tv/events");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadForm });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");

      setForm((current) => ({ ...current, image: result.secure_url }));
      setActionMessage("Image uploaded. Save changes to keep it.");
    } catch (error: any) {
      setActionMessage(`Image upload failed: ${error?.message || String(error)}`);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function saveEvent() {
    if (!eventId) {
      setActionMessage("Save failed: missing event id in URL.");
      return;
    }

    if (!form.title.trim()) {
      setActionMessage("Event title is required.");
      return;
    }

    setSaving(true);
    setActionMessage("Saving event...");

    const approved = form.status === "approved" || form.approved;
    const payload: any = {
      title: form.title.trim(),
      date: form.date || null,
      location: form.location.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      ticket_url: form.ticket_url.trim(),
      poc_email: form.poc_email.trim(),
      poc_phone: form.poc_phone.trim(),
      status: form.status || "pending",
      approved,
      crew_member_ids: Array.from(new Set(selectedCrewIds)),
    };

    if (approved) {
      payload.approved_by = user?.email || user?.id || null;
      payload.approved_at = new Date().toISOString();
    }

    const { error } = await supabase.from("events").update(payload).eq("id", eventId);
    if (error) {
      setActionMessage(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setActionMessage("Event saved, including assigned crew.");
    setSaving(false);
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <a href="/studio/events" className="text-pink-300 font-bold">← Back to Events</a>
        <h1 className="text-4xl md:text-5xl font-black mt-3 mb-2">Edit Event</h1>
        <p className="text-slate-300 mb-8">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Event editor"}</p>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && (
          <div className="space-y-6">
            <section className="bg-white text-slate-950 rounded-2xl p-6 space-y-5">
              {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-xl p-4 font-bold">{actionMessage}</div>}

              <div className="grid md:grid-cols-2 gap-4">
                <label className="grid gap-2 text-sm font-bold">Event Title<input className="border rounded-lg p-3 font-normal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold">Date<input type="date" className="border rounded-lg p-3 font-normal" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold md:col-span-2">Location<input className="border rounded-lg p-3 font-normal" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold md:col-span-2">Description<textarea className="border rounded-lg p-3 font-normal min-h-32" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold">Ticket URL<input className="border rounded-lg p-3 font-normal" value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold">Status<select className="border rounded-lg p-3 font-normal" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value, approved: e.target.value === "approved" })}><option value="pending">pending</option><option value="approved">approved</option><option value="on_hold">on_hold</option><option value="rejected">rejected</option></select></label>
                <label className="grid gap-2 text-sm font-bold">POC Email<input className="border rounded-lg p-3 font-normal" value={form.poc_email} onChange={(e) => setForm({ ...form, poc_email: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-bold">POC Phone<input className="border rounded-lg p-3 font-normal" value={form.poc_phone} onChange={(e) => setForm({ ...form, poc_phone: e.target.value })} /></label>
              </div>

              <div className="grid gap-2 text-sm font-bold">
                Image
                <input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" />
                <input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste image URL" />
                {form.image && <img src={form.image} alt="Event preview" className="w-48 h-48 object-cover rounded-xl border" />}
                {!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}
              </div>

              <div className="border rounded-2xl p-4 bg-slate-50">
                <h2 className="text-xl font-black">Assign SDTV Crew</h2>
                <p className="text-sm text-gray-600 mt-1 mb-4">Private admin-only assignment. These names are not shown publicly.</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {teamMembers.map((member) => (
                    <label key={member.user_id} className="flex items-center gap-3 border rounded-xl p-3 bg-white text-sm">
                      <input type="checkbox" checked={selectedCrewIds.includes(member.user_id)} onChange={() => toggleCrewMember(member.user_id)} />
                      <span><b>{member.name || member.email}</b><br /><span className="text-gray-500">{member.email} · {member.role}</span></span>
                    </label>
                  ))}
                  {teamMembers.length === 0 && <p className="text-sm text-gray-500">No approved team members found in roles yet.</p>}
                </div>
              </div>

              <button onClick={saveEvent} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-6 py-3 rounded-xl font-black disabled:opacity-60">{saving ? "Saving..." : "Save Event"}</button>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <p className="text-pink-600 font-black uppercase tracking-wide text-sm">Video Production</p>
                  <h2 className="text-2xl font-black mt-1">Video Production Status</h2>
                  <p className="text-gray-600 mt-2">Track post-event editing, review, approval, and publishing for this event.</p>
                </div>
                {videoWorkflow?.id ? <a href={`/studio/video-production/${videoWorkflow.id}`} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black whitespace-nowrap">Open Workflow</a> : <a href="/studio/video-production" className="bg-slate-950 text-white px-5 py-3 rounded-xl font-black whitespace-nowrap">Create Workflow</a>}
              </div>

              {videoWorkflow?.id ? <div className="grid md:grid-cols-2 gap-4 mt-6 text-sm">
                <div className="border rounded-2xl p-4 bg-slate-50"><b>Status</b><p className="capitalize text-pink-600 font-black mt-1">{statusLabel(videoWorkflow.status)}</p></div>
                <div className="border rounded-2xl p-4 bg-slate-50"><b>Updated</b><p className="text-gray-700 mt-1">{dateText(videoWorkflow.updated_at) || "Not available"}</p></div>
                <div className="border rounded-2xl p-4 bg-slate-50"><b>Editor</b><p className="text-gray-700 mt-1">{videoWorkflow.assigned_editor_email || "Not assigned"}</p></div>
                <div className="border rounded-2xl p-4 bg-slate-50"><b>Crew Reviewer</b><p className="text-gray-700 mt-1">{videoWorkflow.crew_reviewer_email || "Not assigned"}</p></div>
                <div className="border rounded-2xl p-4 bg-slate-50 md:col-span-2"><b>Media Sources</b><div className="flex flex-wrap gap-3 mt-2">{videoWorkflow.raw_media_url ? <a href={videoWorkflow.raw_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">SDTV folder</a> : null}{videoWorkflow.external_media_url ? <a href={videoWorkflow.external_media_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">External folder</a> : null}{!videoWorkflow.raw_media_url && !videoWorkflow.external_media_url && <span className="text-gray-500">No media source yet.</span>}</div></div>
                {latestVideoRevision && <div className="border rounded-2xl p-4 bg-yellow-50 md:col-span-2"><b>Latest Revision / Feedback</b><p className="text-gray-700 mt-1">Revision {latestVideoRevision.revision_number} · {latestVideoRevision.submitted_by_email || "Unknown"} · {dateText(latestVideoRevision.created_at)}</p><div className="flex flex-wrap gap-3 mt-2">{latestVideoRevision.full_video_url && <a href={latestVideoRevision.full_video_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Full video draft</a>}{latestVideoRevision.reel_url && <a href={latestVideoRevision.reel_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Reel draft</a>}</div>{latestVideoRevision.feedback && <p className="whitespace-pre-line mt-2 text-yellow-900">{latestVideoRevision.feedback}</p>}</div>}
                {(videoWorkflow.youtube_url || videoWorkflow.instagram_url || videoWorkflow.facebook_url) && <div className="border rounded-2xl p-4 bg-green-50 md:col-span-2"><b>Published Links</b><div className="flex flex-wrap gap-3 mt-2">{videoWorkflow.youtube_url && <a href={videoWorkflow.youtube_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">YouTube</a>}{videoWorkflow.instagram_url && <a href={videoWorkflow.instagram_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Instagram</a>}{videoWorkflow.facebook_url && <a href={videoWorkflow.facebook_url} target="_blank" rel="noreferrer" className="text-pink-600 font-bold">Facebook</a>}</div></div>}
              </div> : <div className="border border-dashed rounded-2xl p-5 mt-6 text-gray-600">No video production workflow exists for this event yet. Use Create Workflow after crew has uploaded raw media and notes.</div>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

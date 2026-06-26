"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const TEAM_AREAS = ["General Team", "Events Team", "Radio Team", "Production Team", "Photography Team", "Social Media Team", "Marketing Team", "Youth Team"];
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
function label(value?: string | null) { if (value === "awaiting_orientation") return "Awaiting Orientation"; if (value === "awaiting_onboarding") return "Waiting for Onboarding"; if (value === "awaiting_team_role_access") return "Awaiting Team Role Access"; if (value === "approved") return "Approved"; if (value === "rejected") return "Rejected"; return value || "Pending"; }
function cleanEmail(value?: string | null) { return String(value || "").trim().toLowerCase(); }

export default function StudioVolunteersPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [teamAreas, setTeamAreas] = useState<Record<string, string>>({});
  const canAccess = Boolean(user && isAdminRole(role));
  const submissionByRequestId = useMemo(() => { const map: Record<string, any> = {}; submissions.forEach((item: any) => { if (item.volunteer_request_id) map[item.volunteer_request_id] = item; }); return map; }, [submissions]);

  function openReview(request: any, onboarding: any) { setSelected({ request, onboarding }); setPhotoMessage(""); setEditProfile(onboarding ? { full_name: onboarding.full_name || "", phone: onboarding.phone || "", city: onboarding.city || "", interests: onboarding.interests || "", availability: onboarding.availability || "", experience: onboarding.experience || "", photo_url: onboarding.photo_url || "" } : null); }
  async function notifyVolunteer(request: any, title: string, body: string, link: string) { if (!request?.user_id) return; await supabase.from("notifications").insert({ user_id: request.user_id, title, message: body, link, read: false }); }
  async function loadVolunteers() {
    const requestResult = await supabase.from("user_role_requests").select("id,user_id,email,requested_role,status,approved_role,approved_by,approved_at,created_at").eq("requested_role", "volunteer").order("created_at", { ascending: false });
    if (requestResult.error) { setActionMessage(`Could not load volunteer requests: ${requestResult.error.message}`); return; }
    const submissionResult = await supabase.from("volunteer_onboarding_submissions").select("id,user_id,email,volunteer_request_id,full_name,phone,city,interests,availability,experience,photo_url,agreement_acknowledged,agreement_acknowledged_at,status,created_at").order("created_at", { ascending: false });
    if (submissionResult.error) setActionMessage(`Volunteer requests loaded, but onboarding submissions could not load: ${submissionResult.error.message}`);
    const rows = requestResult.data || []; const areaDefaults: Record<string, string> = {}; rows.forEach((request: any) => { areaDefaults[request.id] = teamAreas[request.id] || "General Team"; }); setRequests(rows); setSubmissions(submissionResult.data || []); setTeamAreas(areaDefaults);
  }
  async function init() { setLoading(true); setMessage("Checking access..."); setActionMessage(""); const sessionResult = await supabase.auth.getSession(); const currentUser = sessionResult.data?.session?.user || null; setUser(currentUser); if (!currentUser) { setMessage("Please login to access volunteer management."); setLoading(false); return; } const nextRole = await resolveUserRole(supabase, currentUser); setRole(nextRole); if (!isAdminRole(nextRole)) { setMessage("This account does not have volunteer management access."); setLoading(false); return; } await loadVolunteers(); setMessage(""); setLoading(false); }
  async function updateStatus(request: any, status: string) { setActionMessage(`Updating ${request.email} to ${label(status)}...`); const patch: any = { status }; if (status === "approved" || status === "rejected") { patch.approved_by = user?.email || user?.id || null; patch.approved_at = new Date().toISOString(); } const { error } = await supabase.from("user_role_requests").update(patch).eq("id", request.id); if (error) { setActionMessage(`Status update failed: ${error.message}`); return; } if (status === "awaiting_onboarding") await notifyVolunteer(request, "Volunteer onboarding ready", "Your SDTV orientation is complete. Please complete your onboarding form.", "/onboarding"); setActionMessage(`Updated ${request.email} to ${label(status)}.`); await loadVolunteers(); }
  async function saveTeamArea(request: any, teamArea: string) { const onboarding = submissionByRequestId[request.id]; await supabase.from("volunteer_team_assignments").upsert({ user_id: request.user_id, email: request.email, volunteer_request_id: request.id, onboarding_submission_id: onboarding?.id || null, team_area: teamArea, assigned_by: user?.email || user?.id || null, assigned_at: new Date().toISOString() }, { onConflict: "volunteer_request_id" }); }

  async function publishToTeamPage(request: any, onboardingOverride?: any) {
    const onboarding = onboardingOverride || submissionByRequestId[request.id];
    if (!onboarding) { setActionMessage("No onboarding profile found. Ask the volunteer to complete onboarding before publishing to Team page."); return false; }
    const teamArea = teamAreas[request.id] || "General Team";
    const name = String(onboarding.full_name || request.email || "SDTV Team Member").trim();
    const title = teamArea;
    const image = String(onboarding.photo_url || "").trim();
    const email = cleanEmail(request.email || onboarding.email);
    const now = new Date().toISOString();
    const payload: any = { user_id: request.user_id || onboarding.user_id || null, email, name, title, image, show_on_public_team: true, updated_at: now };

    let existing: any = null;
    if (payload.user_id) {
      const byUser = await supabase.from("team_members").select("id").eq("user_id", payload.user_id).limit(1).maybeSingle();
      existing = byUser.data || null;
    }
    if (!existing && email) {
      const byEmail = await supabase.from("team_members").select("id").eq("email", email).limit(1).maybeSingle();
      existing = byEmail.data || null;
    }
    if (!existing && name) {
      const byName = await supabase.from("team_members").select("id").ilike("name", name).limit(1).maybeSingle();
      existing = byName.data || null;
    }

    const result = existing?.id
      ? await supabase.from("team_members").update(payload).eq("id", existing.id)
      : await supabase.from("team_members").insert({ ...payload, created_by: user?.id || user?.email || null });
    if (result.error) { setActionMessage(`Team access was processed, but Team page auto-sync failed: ${result.error.message}.`); return false; }
    return true;
  }

  async function approveTeamAccess(request: any) {
    const teamArea = teamAreas[request.id] || "General Team";
    setActionMessage(`Approving ${request.email} for ${teamArea} and syncing Team page...`);
    const upsertResult = await supabase.from("admins").upsert({ user_id: request.user_id, email: request.email, role: "team_member" }, { onConflict: "email" });
    if (upsertResult.error) { setActionMessage(`Could not assign team member role: ${upsertResult.error.message}`); return; }
    await saveTeamArea(request, teamArea);
    const updateResult = await supabase.from("user_role_requests").update({ status: "approved", approved_role: "team_member", approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }).eq("id", request.id);
    if (updateResult.error) { setActionMessage(`Role assigned, but request update failed: ${updateResult.error.message}`); return; }
    const published = await publishToTeamPage(request);
    await notifyVolunteer(request, "SDTV team access approved", `Your SDTV team access is approved. Assigned area: ${teamArea}.`, "/my-hub");
    setActionMessage(`Approved ${request.email} as team_member for ${teamArea}.${published ? " Team page profile auto-synced." : " Team page profile needs manual review."}`);
    await loadVolunteers();
  }

  async function uploadAdminProfilePhoto(file?: File) { setPhotoMessage(""); if (!file || !editProfile) return; if (!file.type.startsWith("image/")) { setPhotoMessage("Please upload an image file."); return; } if (!cloudinaryCloudName || !cloudinaryUploadPreset) { setPhotoMessage("Cloudinary is not configured. Paste a public image URL instead."); return; } setPhotoUploading(true); const body = new FormData(); body.append("file", file); body.append("upload_preset", cloudinaryUploadPreset); body.append("folder", "sdtv/volunteer-profiles"); try { const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, { method: "POST", body }); const result = await response.json(); if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed."); setEditProfile({ ...editProfile, photo_url: result.secure_url }); setPhotoMessage("Replacement photo uploaded. Click Save Profile Changes to keep it."); } catch (error: any) { setPhotoMessage(error?.message || "Photo upload failed. Please try again or paste an image URL."); } finally { setPhotoUploading(false); } }
  async function saveProfileChanges() { if (!selected?.onboarding || !editProfile) return; setSavingProfile(true); setActionMessage("Saving onboarding profile changes..."); const { error } = await supabase.from("volunteer_onboarding_submissions").update(editProfile).eq("id", selected.onboarding.id); setSavingProfile(false); if (error) { setActionMessage(`Profile update failed: ${error.message}`); return; } const updatedOnboarding = { ...selected.onboarding, ...editProfile }; setSelected({ ...selected, onboarding: updatedOnboarding }); if (selected.request?.status === "approved") await publishToTeamPage(selected.request, updatedOnboarding); setActionMessage("Onboarding profile changes saved and Team page profile synced if already approved."); await loadVolunteers(); }
  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h1 className="text-4xl font-black md:text-5xl">Volunteer Management</h1><p className="mt-2 text-slate-300">{user?.email ? `Logged in as ${user.email} · Role: ${role}` : "Studio volunteers"}</p></div><button onClick={init} className="rounded-xl bg-white px-5 py-3 font-black text-slate-950">Refresh</button></div>{loading && <div className="rounded-2xl bg-white/10 p-6">{message}</div>}{!loading && !canAccess && <div className="rounded-2xl bg-white p-8 text-slate-950">{message}</div>}{!loading && canAccess && <div className="grid gap-6 lg:grid-cols-[430px_1fr]">{actionMessage && <div className="lg:col-span-2 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{actionMessage}</div>}<section className="rounded-3xl bg-white p-5 text-slate-950"><h2 className="text-2xl font-black">Volunteer Requests</h2><div className="mt-4 grid max-h-[760px] gap-3 overflow-y-auto pr-1">{requests.map((request) => { const onboarding = submissionByRequestId[request.id]; return <button key={request.id} onClick={() => openReview(request, onboarding)} className={`rounded-2xl border p-4 text-left ${selected?.request?.id === request.id ? "border-pink-500 bg-pink-50" : "bg-white"}`}><div className="flex justify-between gap-3"><div><p className="font-black">{onboarding?.full_name || request.email}</p><p className="text-sm text-slate-600">{request.email}</p><p className="mt-1 text-xs font-bold text-slate-500">{label(request.status)}</p></div>{onboarding?.photo_url && <img src={onboarding.photo_url} alt="profile" className="h-14 w-14 rounded-xl object-cover" />}</div></button>; })}</div></section><section className="rounded-3xl bg-white p-6 text-slate-950">{!selected && <div className="text-slate-500">Select a volunteer request to review onboarding and approve team access.</div>}{selected && <div><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Selected Volunteer</p><h2 className="text-3xl font-black">{selected.onboarding?.full_name || selected.request.email}</h2><p className="text-sm font-bold text-slate-500">{selected.request.email}</p><p className="mt-2 rounded-full bg-slate-100 px-3 py-1 inline-block text-xs font-black">{label(selected.request.status)}</p></div><div className="grid gap-2"><select value={teamAreas[selected.request.id] || "General Team"} onChange={(e) => setTeamAreas({ ...teamAreas, [selected.request.id]: e.target.value })} className="rounded-xl border p-3 font-bold">{TEAM_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</select><button onClick={() => openReview(selected.request, selected.onboarding)} className="rounded-xl bg-slate-950 px-5 py-3 font-black text-white">Review / Edit Profile</button><button onClick={() => selected.onboarding && publishToTeamPage(selected.request)} className="rounded-xl border border-green-600 px-5 py-3 font-black text-green-700">Sync Team Page Profile</button>{selected.request.status !== "approved" && <button onClick={() => approveTeamAccess(selected.request)} className="rounded-xl bg-green-50 px-5 py-3 font-black text-green-700">Approve team member</button>}</div></div>{selected.onboarding ? <div className="mt-6 grid gap-4 md:grid-cols-2"><label className="font-bold">Full Name<input value={editProfile?.full_name || ""} onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Phone<input value={editProfile?.phone || ""} onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">City<input value={editProfile?.city || ""} onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold">Photo<input type="file" accept="image/*" onChange={(e) => uploadAdminProfilePhoto(e.target.files?.[0])} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Photo URL<input value={editProfile?.photo_url || ""} onChange={(e) => setEditProfile({ ...editProfile, photo_url: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Interests<textarea value={editProfile?.interests || ""} onChange={(e) => setEditProfile({ ...editProfile, interests: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Availability<textarea value={editProfile?.availability || ""} onChange={(e) => setEditProfile({ ...editProfile, availability: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal" /></label><label className="font-bold md:col-span-2">Experience<textarea value={editProfile?.experience || ""} onChange={(e) => setEditProfile({ ...editProfile, experience: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 font-normal" /></label><button onClick={saveProfileChanges} disabled={savingProfile || photoUploading} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white md:col-span-2 disabled:opacity-60">{savingProfile ? "Saving..." : "Save Profile Changes"}</button></div> : <div className="mt-6 rounded-2xl bg-yellow-50 p-5 text-yellow-900 font-bold">No onboarding submission found yet.</div>}</div>}</section></div>}</div></main>;
}

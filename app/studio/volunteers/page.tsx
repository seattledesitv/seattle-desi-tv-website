"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const TEAM_AREAS = ["General Team", "Events Team", "Radio Team", "Production Team", "Photography Team", "Social Media Team", "Marketing Team", "Youth Team"];
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

function label(value?: string | null) {
  if (value === "awaiting_orientation") return "Awaiting Orientation";
  if (value === "awaiting_onboarding") return "Complete Onboarding";
  if (value === "awaiting_team_role_access") return "Awaiting Team Role Access";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return value || "Pending";
}

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

  const submissionByRequestId = useMemo(() => {
    const map: Record<string, any> = {};
    submissions.forEach((item: any) => { if (item.volunteer_request_id) map[item.volunteer_request_id] = item; });
    return map;
  }, [submissions]);

  function openReview(request: any, onboarding: any) {
    setSelected({ request, onboarding });
    setPhotoMessage("");
    setEditProfile(onboarding ? {
      full_name: onboarding.full_name || "",
      phone: onboarding.phone || "",
      city: onboarding.city || "",
      interests: onboarding.interests || "",
      availability: onboarding.availability || "",
      experience: onboarding.experience || "",
      photo_url: onboarding.photo_url || "",
    } : null);
  }

  async function notifyVolunteer(request: any, title: string, body: string, link: string) {
    if (!request?.user_id) return;
    await supabase.from("notifications").insert({ user_id: request.user_id, title, message: body, link, read: false });
  }

  async function loadVolunteers() {
    const requestResult = await supabase.from("user_role_requests").select("id,user_id,email,requested_role,status,approved_role,approved_by,approved_at,created_at").eq("requested_role", "volunteer").order("created_at", { ascending: false });
    if (requestResult.error) { setActionMessage(`Could not load volunteer requests: ${requestResult.error.message}`); return; }
    const submissionResult = await supabase.from("volunteer_onboarding_submissions").select("id,user_id,email,volunteer_request_id,full_name,phone,city,interests,availability,experience,photo_url,agreement_acknowledged,agreement_acknowledged_at,status,created_at").order("created_at", { ascending: false });
    if (submissionResult.error) setActionMessage(`Volunteer requests loaded, but onboarding submissions could not load: ${submissionResult.error.message}`);
    const rows = requestResult.data || [];
    const areaDefaults: Record<string, string> = {};
    rows.forEach((request: any) => { areaDefaults[request.id] = teamAreas[request.id] || "General Team"; });
    setRequests(rows);
    setSubmissions(submissionResult.data || []);
    setTeamAreas(areaDefaults);
  }

  async function init() {
    setLoading(true); setMessage("Checking access..."); setActionMessage("");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to access volunteer management."); setLoading(false); return; }
    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isAdminRole(nextRole)) { setMessage("This account does not have volunteer management access."); setLoading(false); return; }
    await loadVolunteers(); setMessage(""); setLoading(false);
  }

  async function updateStatus(request: any, status: string) {
    setActionMessage(`Updating ${request.email} to ${label(status)}...`);
    const patch: any = { status };
    if (status === "approved" || status === "rejected") { patch.approved_by = user?.email || user?.id || null; patch.approved_at = new Date().toISOString(); }
    const { error } = await supabase.from("user_role_requests").update(patch).eq("id", request.id);
    if (error) { setActionMessage(`Status update failed: ${error.message}`); return; }
    if (status === "awaiting_onboarding") await notifyVolunteer(request, "Volunteer onboarding ready", "Your SDTV orientation is complete. Please complete your onboarding form.", "/onboarding");
    setActionMessage(`Updated ${request.email} to ${label(status)}.`);
    await loadVolunteers();
  }

  async function saveTeamArea(request: any, teamArea: string) {
    const onboarding = submissionByRequestId[request.id];
    await supabase.from("volunteer_team_assignments").upsert({ user_id: request.user_id, email: request.email, volunteer_request_id: request.id, onboarding_submission_id: onboarding?.id || null, team_area: teamArea, assigned_by: user?.email || user?.id || null, assigned_at: new Date().toISOString() }, { onConflict: "volunteer_request_id" });
  }

  async function approveTeamAccess(request: any) {
    const teamArea = teamAreas[request.id] || "General Team";
    setActionMessage(`Approving ${request.email} for ${teamArea}...`);
    const upsertResult = await supabase.from("admins").upsert({ user_id: request.user_id, email: request.email, role: "team_member" }, { onConflict: "email" });
    if (upsertResult.error) { setActionMessage(`Could not assign team member role: ${upsertResult.error.message}`); return; }
    await saveTeamArea(request, teamArea);
    const updateResult = await supabase.from("user_role_requests").update({ status: "approved", approved_role: "team_member", approved_by: user?.email || user?.id || null, approved_at: new Date().toISOString() }).eq("id", request.id);
    if (updateResult.error) { setActionMessage(`Role assigned, but request update failed: ${updateResult.error.message}`); return; }
    await notifyVolunteer(request, "SDTV team access approved", `Your SDTV team access is approved. Assigned area: ${teamArea}.`, "/my-hub");
    setActionMessage(`Approved ${request.email} as team_member for ${teamArea}.`);
    await loadVolunteers();
  }

  async function uploadAdminProfilePhoto(file?: File) {
    setPhotoMessage("");
    if (!file || !editProfile) return;
    if (!file.type.startsWith("image/")) { setPhotoMessage("Please upload an image file."); return; }
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) { setPhotoMessage("Cloudinary is not configured. Paste a public image URL instead."); return; }
    setPhotoUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", cloudinaryUploadPreset);
    body.append("folder", "sdtv/volunteer-profiles");
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed.");
      setEditProfile({ ...editProfile, photo_url: result.secure_url });
      setPhotoMessage("Replacement photo uploaded. Click Save Profile Changes to keep it.");
    } catch (error: any) {
      setPhotoMessage(error?.message || "Photo upload failed. Please try again or paste an image URL.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveProfileChanges() {
    if (!selected?.onboarding?.id || !editProfile) return;
    setSavingProfile(true);
    setActionMessage("Saving volunteer profile changes...");
    const { error } = await supabase.from("volunteer_onboarding_submissions").update({
      full_name: editProfile.full_name,
      phone: editProfile.phone,
      city: editProfile.city,
      interests: editProfile.interests,
      availability: editProfile.availability,
      experience: editProfile.experience,
      photo_url: editProfile.photo_url,
    }).eq("id", selected.onboarding.id);
    setSavingProfile(false);
    if (error) { setActionMessage(`Could not save profile changes: ${error.message}`); return; }
    setActionMessage("Volunteer profile updated.");
    setSelected(null);
    setEditProfile(null);
    await loadVolunteers();
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader /><div className="max-w-7xl mx-auto px-6 py-10"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"><div><h1 className="text-4xl md:text-5xl font-black">Volunteer Requests</h1><p className="text-slate-300 mt-2">Complete orientation, review onboarding, edit profiles, choose a team area, and approve team access.</p>{user?.email && <p className="text-slate-400 text-sm mt-2">Logged in as {user.email} · Role: {role || "none"}</p>}</div><button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button></div>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}</div>}{!loading && canAccess && <div className="space-y-5">{actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}<div className="grid md:grid-cols-4 gap-4">{["awaiting_orientation", "awaiting_onboarding", "awaiting_team_role_access", "approved"].map((status) => <div key={status} className="bg-white/10 rounded-2xl p-5"><p className="text-slate-300 text-sm font-bold uppercase">{label(status)}</p><p className="text-4xl font-black">{requests.filter((request) => request.status === status).length}</p></div>)}</div><div className="grid gap-4">{requests.map((request) => { const onboarding = submissionByRequestId[request.id]; return <article key={request.id} className="bg-white text-slate-950 rounded-2xl p-5 grid xl:grid-cols-[1fr_auto] gap-4"><div><div className="flex gap-4 items-start"><div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden grid place-items-center shrink-0">{onboarding?.photo_url ? <img src={onboarding.photo_url} alt={onboarding.full_name || request.email} className="w-full h-full object-cover" /> : <span className="font-black text-pink-600">SDTV</span>}</div><div><h2 className="text-xl font-black">{onboarding?.full_name || request.email}</h2><p className="text-sm text-gray-600">{request.email}</p><p className="text-sm text-gray-600 mt-1">Status: <b>{label(request.status)}</b></p>{onboarding && <p className="text-sm text-green-700 font-bold mt-1">Onboarding submitted · Agreement: {onboarding.agreement_acknowledged ? "Yes" : "No"}</p>}</div></div>{onboarding && <div className="grid md:grid-cols-2 gap-3 mt-4 text-sm"><p><b>Phone:</b> {onboarding.phone || "—"}</p><p><b>City:</b> {onboarding.city || "—"}</p><p><b>Interests:</b> {onboarding.interests || "—"}</p><p><b>Availability:</b> {onboarding.availability || "—"}</p></div>}</div><div className="flex flex-wrap xl:flex-col gap-2 xl:min-w-60"><label className="text-xs font-black uppercase text-gray-500">Team Area<select className="mt-1 w-full border rounded-xl px-3 py-2 text-sm font-bold" value={teamAreas[request.id] || "General Team"} onChange={(event) => setTeamAreas({ ...teamAreas, [request.id]: event.target.value })}>{TEAM_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}</select></label><button onClick={() => updateStatus(request, "awaiting_onboarding")} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Complete Orientation</button><button onClick={() => openReview(request, onboarding)} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm">Review / Edit Profile</button><button onClick={() => approveTeamAccess(request)} className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm">Approve Team Access</button><button onClick={() => updateStatus(request, "rejected")} className="border border-red-600 text-red-700 px-4 py-2 rounded-xl font-bold text-sm">Reject</button></div></article>; })}{requests.length === 0 && <div className="bg-white text-slate-950 rounded-2xl p-8">No volunteer requests found.</div>}</div></div>}{selected && <div className="fixed inset-0 bg-black/70 z-50 p-4 overflow-y-auto"><div className="bg-white text-slate-950 rounded-3xl max-w-4xl mx-auto p-6 md:p-8"><div className="flex justify-between gap-4"><div><h2 className="text-3xl font-black">Volunteer Profile Review</h2><p className="text-gray-600">{selected.request.email}</p></div><button onClick={() => { setSelected(null); setEditProfile(null); }} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold h-fit">Close</button></div>{!selected.onboarding && <div className="bg-yellow-50 text-yellow-900 rounded-2xl p-5 mt-5 font-bold">No onboarding submission found yet.</div>}{selected.onboarding && editProfile && <div className="grid gap-5 mt-5"><div className="flex gap-4 items-center">{editProfile.photo_url && <img src={editProfile.photo_url} alt={editProfile.full_name} className="w-24 h-24 rounded-2xl object-cover" />}<div><h3 className="text-2xl font-black">{editProfile.full_name || selected.request.email}</h3><p>{editProfile.phone}</p><p>{editProfile.city}</p></div></div><div className="grid md:grid-cols-2 gap-4"><label className="font-bold">Full Name<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={editProfile.full_name} onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })} /></label><label className="font-bold">Phone<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={editProfile.phone} onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })} /></label><label className="font-bold">City / Area<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={editProfile.city} onChange={(e) => setEditProfile({ ...editProfile, city: e.target.value })} /></label><label className="font-bold">Replace Photo<input type="file" accept="image/*" className="w-full border rounded-xl p-3 mt-1 font-normal" onChange={(e) => uploadAdminProfilePhoto(e.target.files?.[0])} /></label><label className="font-bold md:col-span-2">Profile Photo URL<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={editProfile.photo_url} onChange={(e) => setEditProfile({ ...editProfile, photo_url: e.target.value })} /></label>{photoMessage && <p className="md:col-span-2 text-sm text-pink-700 font-bold">{photoMessage}</p>}</div><label className="font-bold">Interests<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-24" value={editProfile.interests} onChange={(e) => setEditProfile({ ...editProfile, interests: e.target.value })} /></label><label className="font-bold">Availability<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" value={editProfile.availability} onChange={(e) => setEditProfile({ ...editProfile, availability: e.target.value })} /></label><label className="font-bold">Experience<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" value={editProfile.experience} onChange={(e) => setEditProfile({ ...editProfile, experience: e.target.value })} /></label><div className="bg-green-50 text-green-800 rounded-2xl p-4 font-bold">Agreement acknowledged: {selected.onboarding.agreement_acknowledged ? "Yes" : "No"}</div><div className="flex flex-wrap gap-3"><button onClick={saveProfileChanges} disabled={savingProfile || photoUploading} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black disabled:opacity-60">{photoUploading ? "Uploading Photo..." : savingProfile ? "Saving..." : "Save Profile Changes"}</button><button onClick={() => { approveTeamAccess(selected.request); setSelected(null); }} className="bg-green-600 text-white px-5 py-3 rounded-xl font-black">Approve Team Access</button><button onClick={() => { updateStatus(selected.request, "rejected"); setSelected(null); }} className="border border-red-600 text-red-700 px-5 py-3 rounded-xl font-black">Reject</button></div></div>}</div></div>}</div></main>;
}

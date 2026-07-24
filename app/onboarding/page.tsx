"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const agreementText = `Seattle Desi TV Volunteer & Contributor Agreement

Thank you for choosing to volunteer with Seattle Desi TV (SDTV). SDTV is a community media platform focused on culture, events, interviews, radio, local businesses, youth leadership, and community storytelling.

By submitting this onboarding form, I acknowledge and agree to the following:

1. Community Standards
I will represent SDTV respectfully and professionally at events, interviews, recordings, radio programs, online discussions, and community interactions. I will treat organizers, guests, sponsors, viewers, team members, and the public with courtesy and respect.

2. Volunteer Role
I understand that volunteer participation does not create employment, compensation, ownership, or agency rights. SDTV may assign, change, pause, or end volunteer responsibilities based on community needs, availability, conduct, and team fit.

3. Media, Content, and Brand
I will not publish, distribute, edit, remove, monetize, or represent SDTV content, logo, recordings, photos, interviews, credentials, or brand materials without SDTV approval. Content captured for SDTV may be used by SDTV across website, social media, radio, YouTube, promotional materials, sponsor decks, archives, and partner communications.

4. Event Conduct
When attending an event as an SDTV volunteer, I will follow organizer rules, venue rules, safety instructions, media access boundaries, and SDTV assignment guidance. I will not promise coverage, sponsorship, publishing, interviews, approvals, discounts, or partnerships unless authorized by SDTV leadership.

5. Confidentiality
I may receive private information such as internal contacts, sponsor discussions, unpublished content, team planning, guest details, volunteer records, access links, credentials, or event logistics. I will keep this information confidential and use it only for SDTV-approved work.

6. Safety and Consent
I will act safely and responsibly. I will seek appropriate consent before recording interviews or using personal images where required. I will immediately report concerns, conflicts, harassment, safety issues, or misuse of SDTV access to the SDTV team.

7. Equipment and Access
Any SDTV-provided credentials, accounts, files, footage, documents, equipment, or access must be used only for approved SDTV work and returned or removed when requested. I will not share login credentials or access with others.

8. Conflict of Interest
I will disclose potential conflicts, including paid engagements, sponsor relationships, competing media work, or situations where I may personally benefit from SDTV access or coverage.

9. Photo and Profile Permission
I authorize SDTV to use the profile details and photo I submit for internal onboarding, team coordination, public team pages, credits, assignments, and SDTV promotional or recognition purposes, unless I separately request limited use.

10. Acknowledgment
I have read and understood this agreement. I agree to follow SDTV standards and understand that final team access is subject to SDTV review and approval.`;

function normalizePhone(value: string) {
  const trimmed = String(value || "").trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return trimmed;
}
function isValidPhone(value: string) {
  const normalized = normalizePhone(value);
  return /^\+[1-9]\d{9,14}$/.test(normalized);
}
function requiredMissing(form: any) {
  const missing = [];
  if (!form.full_name.trim()) missing.push("Full Name");
  if (!form.phone.trim()) missing.push("Phone");
  if (!form.city.trim()) missing.push("City / Area");
  if (!form.interests.trim()) missing.push("Areas you want to help with");
  if (!form.availability.trim()) missing.push("Availability");
  if (!form.photo_url.trim()) missing.push("Profile Photo");
  return missing;
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState("Checking your account...");
  const [photoMessage, setPhotoMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [volunteerRequest, setVolunteerRequest] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "", interests: "", availability: "", experience: "", photo_url: "", emergency_contact: "", emergency_phone: "", agreement_acknowledged: false });

  async function init() {
    setLoading(true);
    setMessage("Checking your account...");
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user || null;
    setUser(currentUser);
    if (!currentUser?.email) { setMessage("Please login before completing onboarding."); setLoading(false); return; }
    setForm((current) => ({ ...current, full_name: currentUser.user_metadata?.full_name || current.full_name || "" }));
    const { data, error } = await supabase.from("user_role_requests").select("id,user_id,email,requested_role,status,created_at").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).eq("requested_role", "volunteer").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) { setMessage(`Could not load volunteer request: ${error.message}`); setLoading(false); return; }
    setVolunteerRequest(data);
    if (!data) setMessage("No volunteer request found. Please request to volunteer from Settings first.");
    else if (data.status === "awaiting_orientation") setMessage("Your orientation is not marked complete yet. SDTV will enable onboarding after orientation.");
    else if (data.status === "awaiting_team_role_access") setMessage("Your onboarding was already submitted and is awaiting team role access approval.");
    else if (data.status === "approved") setMessage("Your volunteer request is already approved.");
    else setMessage("");
    setLoading(false);
  }

  function updateField(field: string, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function uploadProfilePhoto(file?: File) {
    setPhotoMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoMessage("Please upload an image file."); return; }
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) { setPhotoMessage("Cloudinary is not configured. Please paste a public image URL instead."); return; }
    setPhotoUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", cloudinaryUploadPreset);
    body.append("folder", "sdtv/volunteer-profiles");
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed.");
      updateField("photo_url", result.secure_url);
      setPhotoMessage("Profile photo uploaded.");
    } catch (error: any) {
      setPhotoMessage(error?.message || "Profile photo upload failed. Please try again or paste a public image URL.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function submitOnboarding() {
    setMessage("");
    if (!user?.email || !volunteerRequest?.id) { setMessage("Please login and start the volunteer request first."); return; }
    if (volunteerRequest.status !== "awaiting_onboarding") { setMessage("Onboarding is available after SDTV marks your orientation complete."); return; }
    const missing = requiredMissing(form);
    if (missing.length) { setMessage(`Please complete these required fields: ${missing.join(", ")}.`); return; }
    if (!isValidPhone(form.phone)) { setMessage("Please enter a valid phone number with country code, for example +14255551234. US 10-digit numbers will be formatted automatically."); return; }
    if (form.emergency_phone.trim() && !isValidPhone(form.emergency_phone)) { setMessage("Please enter a valid emergency phone number with country code, for example +14255551234."); return; }
    if (!form.agreement_acknowledged) { setMessage("Please acknowledge the SDTV agreement."); return; }
    if (photoUploading) { setMessage("Please wait for the profile photo upload to finish."); return; }
    setSubmitting(true);
    const normalizedPhone = normalizePhone(form.phone);
    const normalizedEmergencyPhone = form.emergency_phone.trim() ? normalizePhone(form.emergency_phone) : "";
    const payload = {
      user_id: user.id,
      email: user.email,
      volunteer_request_id: volunteerRequest.id,
      full_name: form.full_name.trim(),
      phone: normalizedPhone,
      city: form.city.trim(),
      interests: form.interests.trim(),
      availability: form.availability.trim(),
      experience: form.experience.trim(),
      photo_url: form.photo_url.trim(),
      emergency_contact: form.emergency_contact.trim(),
      emergency_phone: normalizedEmergencyPhone,
      agreement_acknowledged: true,
      agreement_acknowledged_at: new Date().toISOString(),
      agreement_text: agreementText,
      status: "submitted",
    };
    const { error: insertError } = await supabase.from("volunteer_onboarding_submissions").insert(payload);
    if (insertError) { setSubmitting(false); setMessage(`Could not submit onboarding: ${insertError.message}. Please confirm the volunteer_onboarding_submissions table exists in Supabase.`); return; }
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: user.id,
      email: user.email,
      role: "volunteer",
      full_name: payload.full_name,
      phone: payload.phone,
      city: payload.city,
      profile_photo_url: payload.photo_url,
      short_bio: payload.experience || null,
      interests: payload.interests ? payload.interests.split(",").map((x) => x.trim()).filter(Boolean) : [],
      allow_sdtv_contact: true,
      keep_profile_private: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (profileError) { setSubmitting(false); setMessage(`Onboarding saved, but base profile sync failed: ${profileError.message}`); return; }
    const { error: updateError } = await supabase.from("user_role_requests").update({ status: "awaiting_team_role_access" }).eq("id", volunteerRequest.id);
    setSubmitting(false);
    if (updateError) { setMessage(`Onboarding and base profile saved, but status update failed: ${updateError.message}`); return; }
    setVolunteerRequest({ ...volunteerRequest, status: "awaiting_team_role_access" });
    setMessage("Onboarding submitted and your Base SDTV Profile was created. Your request is now awaiting team role access approval. Redirecting back to My Hub...");
    setTimeout(() => { window.location.href = "/my-hub"; }, 1500);
  }

  useEffect(() => { init(); }, []);

  const canSubmit = volunteerRequest?.status === "awaiting_onboarding";

  return <main className="min-h-screen bg-slate-950 text-white px-6 py-10"><div className="max-w-4xl mx-auto"><a href="/my-hub" className="text-pink-300 font-bold">← Back to My Hub</a><div className="mt-5 bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-2xl"><h1 className="text-3xl md:text-4xl font-black">Volunteer Onboarding</h1><p className="text-gray-600 mt-2">Complete this after SDTV orientation. Required fields are marked with * and will create your Base SDTV Profile.</p>{loading && <div className="bg-slate-100 rounded-2xl p-5 mt-6 font-bold">{message}</div>}{!loading && message && <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-2xl p-5 mt-6 font-bold whitespace-pre-line">{message}</div>}{!loading && canSubmit && <div className="grid gap-5 mt-6"><div className="grid md:grid-cols-2 gap-4"><label className="font-bold">Full Name *<input className="w-full border rounded-xl p-3 mt-1 font-normal" required value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} /></label><label className="font-bold">Phone *<input className="w-full border rounded-xl p-3 mt-1 font-normal" required placeholder="+14255551234" value={form.phone} onBlur={() => updateField("phone", normalizePhone(form.phone))} onChange={(e) => updateField("phone", e.target.value)} /></label><label className="font-bold">Email<input className="w-full border rounded-xl p-3 mt-1 font-normal bg-slate-100" value={user?.email || ""} disabled /></label><label className="font-bold">City / Area *<input className="w-full border rounded-xl p-3 mt-1 font-normal" required value={form.city} onChange={(e) => updateField("city", e.target.value)} /></label><div className="font-bold"><label>Profile Photo Upload *<input className="w-full border rounded-xl p-3 mt-1 font-normal" type="file" accept="image/*" onChange={(e) => uploadProfilePhoto(e.target.files?.[0])} /></label><p className="text-xs text-gray-500 mt-1">Upload a profile photo, or paste a public image URL below.</p>{photoMessage && <p className="text-xs text-pink-700 mt-1">{photoMessage}</p>}{form.photo_url && <img src={form.photo_url} alt="Profile preview" className="w-20 h-20 rounded-2xl object-cover mt-3 border" />}</div><label className="font-bold">Profile Photo URL *<input className="w-full border rounded-xl p-3 mt-1 font-normal" required placeholder="Uploaded Cloudinary URL will appear here, or paste a public image URL" value={form.photo_url} onChange={(e) => updateField("photo_url", e.target.value)} /></label></div><label className="font-bold">Areas you want to help with *<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-24" required placeholder="Events, interviews, video editing, radio, photography, social media, sponsorships..." value={form.interests} onChange={(e) => updateField("interests", e.target.value)} /></label><label className="font-bold">Availability *<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" required placeholder="Weekdays, weekends, evenings, event coverage availability..." value={form.availability} onChange={(e) => updateField("availability", e.target.value)} /></label><label className="font-bold">Relevant experience<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" placeholder="Media, volunteering, camera, hosting, editing, community work..." value={form.experience} onChange={(e) => updateField("experience", e.target.value)} /></label><div className="grid md:grid-cols-2 gap-4"><label className="font-bold">Emergency Contact<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.emergency_contact} onChange={(e) => updateField("emergency_contact", e.target.value)} /></label><label className="font-bold">Emergency Phone<input className="w-full border rounded-xl p-3 mt-1 font-normal" placeholder="+14255551234" value={form.emergency_phone} onBlur={() => updateField("emergency_phone", normalizePhone(form.emergency_phone))} onChange={(e) => updateField("emergency_phone", e.target.value)} /></label></div><section><h2 className="text-2xl font-black mb-3">SDTV Agreement</h2><div className="h-72 overflow-y-auto border rounded-2xl p-4 bg-slate-50 whitespace-pre-line text-sm leading-6">{agreementText}</div><label className="flex gap-3 items-start mt-4 font-bold"><input type="checkbox" className="mt-1" checked={form.agreement_acknowledged} onChange={(e) => updateField("agreement_acknowledged", e.target.checked)} /><span>I have read and acknowledge the SDTV volunteer/contributor agreement above. *</span></label></section><button type="button" onClick={submitOnboarding} disabled={submitting || photoUploading} className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black disabled:opacity-60">{photoUploading ? "Uploading photo..." : submitting ? "Submitting..." : "Submit Onboarding"}</button></div>}</div></div></main>;
}

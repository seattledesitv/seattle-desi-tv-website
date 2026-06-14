"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

type ProfileForm = {
  full_name: string;
  phone: string;
  city: string;
  interests: string;
  availability: string;
  experience: string;
  photo_url: string;
  emergency_contact: string;
  emergency_phone: string;
};

const emptyForm: ProfileForm = {
  full_name: "",
  phone: "",
  city: "",
  interests: "",
  availability: "",
  experience: "",
  photo_url: "",
  emergency_contact: "",
  emergency_phone: "",
};

function isTeamRole(role: string) {
  const value = String(role || "").toLowerCase();
  return value.includes("team") || value.includes("admin") || value.includes("crew");
}

export default function AccountProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("Checking your account...");
  const [photoMessage, setPhotoMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [profileId, setProfileId] = useState("");
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadProfile() {
    setLoading(true);
    setMessage("Checking your account...");
    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData?.user || null;
    setUser(currentUser);

    if (!currentUser?.email) {
      setMessage("Please login before editing your SDTV profile.");
      setLoading(false);
      return;
    }

    const nextRole = await resolveUserRole(supabase, currentUser);
    setRole(nextRole);
    if (!isTeamRole(nextRole)) {
      setMessage("This profile editor is available after SDTV approves your team access.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("volunteer_onboarding_submissions")
      .select("id,full_name,phone,city,interests,availability,experience,photo_url,emergency_contact,emergency_phone,created_at")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setMessage(`Could not load your profile: ${error.message}`);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("No onboarding profile found yet. Please complete onboarding first or ask an admin to create your profile.");
      setLoading(false);
      return;
    }

    setProfileId(data.id);
    setForm({
      full_name: data.full_name || "",
      phone: data.phone || "",
      city: data.city || "",
      interests: data.interests || "",
      availability: data.availability || "",
      experience: data.experience || "",
      photo_url: data.photo_url || "",
      emergency_contact: data.emergency_contact || "",
      emergency_phone: data.emergency_phone || "",
    });
    setMessage("");
    setLoading(false);
  }

  async function uploadPhoto(file?: File) {
    setPhotoMessage("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoMessage("Please upload an image file.");
      return;
    }
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      setPhotoMessage("Cloudinary is not configured. Please paste a public image URL instead.");
      return;
    }

    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", cloudinaryUploadPreset);
    body.append("folder", "sdtv/volunteer-profiles");

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed.");
      updateField("photo_url", result.secure_url);
      setPhotoMessage("Photo uploaded. Click Save Profile to keep it.");
    } catch (error: any) {
      setPhotoMessage(error?.message || "Photo upload failed. Please try again or paste an image URL.");
    } finally {
      setUploading(false);
    }
  }

  async function syncTeamPageProfile() {
    if (!user?.email) return;
    const { data: assignment } = await supabase
      .from("volunteer_team_assignments")
      .select("team_area")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const teamArea = assignment?.team_area || "General Team";
    const payload: any = {
      user_id: user.id,
      email: user.email,
      name: form.full_name.trim() || user.email,
      title: teamArea,
      image: form.photo_url.trim(),
      show_on_public_team: true,
      updated_at: new Date().toISOString(),
    };

    const result = await supabase.from("team_members").upsert(payload, { onConflict: "user_id" });
    if (result.error) {
      // Older database fallback: do not block saving the private profile if linked columns are not installed yet.
      await supabase.from("team_members").update({ name: payload.name, title: payload.title, image: payload.image }).eq("name", payload.name);
    }
  }

  async function saveProfile() {
    setMessage("");
    if (!profileId) {
      setMessage("No profile record found to update.");
      return;
    }
    if (!form.full_name.trim() || !form.phone.trim()) {
      setMessage("Please enter your name and phone number.");
      return;
    }
    if (uploading) {
      setMessage("Please wait for the photo upload to finish.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("volunteer_onboarding_submissions").update({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      interests: form.interests.trim(),
      availability: form.availability.trim(),
      experience: form.experience.trim(),
      photo_url: form.photo_url.trim(),
      emergency_contact: form.emergency_contact.trim(),
      emergency_phone: form.emergency_phone.trim(),
    }).eq("id", profileId);

    if (error) {
      setSaving(false);
      setMessage(`Could not save profile: ${error.message}. If this is an RLS issue, run supabase/team-profile-enhancements.sql in Supabase.`);
      return;
    }

    await syncTeamPageProfile();
    setSaving(false);
    setMessage("Profile saved. Your Team page photo/details were also refreshed.");
  }

  useEffect(() => { loadProfile(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <a href="/login" className="text-pink-300 font-bold">← Back to Account</a>
        <a href="/my-hub" className="bg-white text-slate-950 px-4 py-2 rounded-xl font-black">My Hub</a>
      </div>

      <section className="bg-white text-slate-950 rounded-3xl p-6 md:p-8 shadow-2xl">
        <p className="text-pink-600 font-black uppercase tracking-wide">Seattle Desi TV</p>
        <h1 className="text-3xl md:text-4xl font-black mt-2">My Team Profile</h1>
        <p className="text-gray-600 mt-2">Approved team members can update their profile details and ID/profile image here. This image is used for the Team page and SDTV profile display.</p>

        {loading && <div className="bg-slate-100 rounded-2xl p-5 mt-6 font-bold">{message}</div>}
        {!loading && message && <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-2xl p-5 mt-6 font-bold whitespace-pre-line">{message}</div>}

        {!loading && profileId && <div className="grid gap-5 mt-6">
          <div className="flex gap-4 items-center bg-slate-50 rounded-2xl p-4">
            {form.photo_url ? <img src={form.photo_url} alt={form.full_name || "SDTV profile"} className="w-24 h-24 rounded-2xl object-cover border" /> : <div className="w-24 h-24 rounded-2xl bg-white grid place-items-center text-pink-600 font-black border">SDTV</div>}
            <div>
              <h2 className="text-2xl font-black">{form.full_name || user?.email}</h2>
              <p className="text-gray-600">Role: {role.replaceAll("_", " ")}</p>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="font-bold">Full Name<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} /></label>
            <label className="font-bold">Phone<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} /></label>
            <label className="font-bold">City / Area<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.city} onChange={(e) => updateField("city", e.target.value)} /></label>
            <label className="font-bold">Upload ID / Profile Image<input type="file" accept="image/*" className="w-full border rounded-xl p-3 mt-1 font-normal" onChange={(e) => uploadPhoto(e.target.files?.[0])} /></label>
            <label className="font-bold md:col-span-2">Profile Image URL<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.photo_url} onChange={(e) => updateField("photo_url", e.target.value)} /></label>
            {photoMessage && <p className="text-sm text-pink-700 font-bold md:col-span-2">{photoMessage}</p>}
          </div>

          <label className="font-bold">Areas you help with<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-24" value={form.interests} onChange={(e) => updateField("interests", e.target.value)} /></label>
          <label className="font-bold">Availability<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" value={form.availability} onChange={(e) => updateField("availability", e.target.value)} /></label>
          <label className="font-bold">Experience / Bio Notes<textarea className="w-full border rounded-xl p-3 mt-1 font-normal min-h-20" value={form.experience} onChange={(e) => updateField("experience", e.target.value)} /></label>

          <div className="grid md:grid-cols-2 gap-4">
            <label className="font-bold">Emergency Contact<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.emergency_contact} onChange={(e) => updateField("emergency_contact", e.target.value)} /></label>
            <label className="font-bold">Emergency Phone<input className="w-full border rounded-xl p-3 mt-1 font-normal" value={form.emergency_phone} onChange={(e) => updateField("emergency_phone", e.target.value)} /></label>
          </div>

          <button onClick={saveProfile} disabled={saving || uploading} className="bg-pink-600 text-white px-6 py-4 rounded-xl font-black disabled:opacity-60">{uploading ? "Uploading..." : saving ? "Saving..." : "Save Profile"}</button>
        </div>}
      </section>
    </div>
  </main>;
}

"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import StudioHeader from "../../components/StudioHeader";
import { firstError, requireText, validateImageFile, validateOptionalUrl } from "../../lib/validation";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

type RadioTeamMember = {
  id: string;
  name: string;
  title: string;
  segment_name: string;
  image: string;
  user_id?: string | null;
  email?: string | null;
  show_on_public_radio?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_role?: string;
  profile_photo_url?: string;
  profile_created_at?: string | null;
};

type ApprovedUser = {
  user_id: string | null;
  email: string;
  role: string;
  full_name?: string | null;
  photo_url?: string | null;
  profile_created_at?: string | null;
  already_radio?: boolean;
};

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function roleCanBeTeamMember(role?: string | null) {
  const normalized = String(role || "").toLowerCase().trim();
  return normalized.includes("admin") || normalized.includes("team_member") || normalized.includes("team member");
}

function roleLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Not connected";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function shortId(value?: string | null) {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) return <div className="w-24 h-24 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>;
  return <img src={src} alt={label} className="w-24 h-24 rounded-xl object-cover bg-gray-100 border" />;
}

function emptyForm() {
  return { name: "", title: "", segment_name: "", image: "", show_on_public_radio: true };
}

export default function StudioRadioTeamPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<RadioTeamMember[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [linkEmail, setLinkEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
  const editingMember = members.find((member) => member.id === editingId) || null;
  const selectedApprovedUser = approvedUsers.find((item) => item.email.toLowerCase() === linkEmail.toLowerCase()) || null;
  const unlistedApprovedUsers = useMemo(() => approvedUsers.filter((item) => !item.already_radio), [approvedUsers]);

  async function enrichMembers(rows: RadioTeamMember[]) {
    const emails = Array.from(new Set(rows.map((row) => String(row.email || "").toLowerCase()).filter(Boolean)));
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];
    const roleByEmail: Record<string, string> = {};
    const roleByUserId: Record<string, string> = {};
    const profileByEmail: Record<string, any> = {};
    const profileByUserId: Record<string, any> = {};

    if (emails.length > 0 || userIds.length > 0) {
      let adminQuery = supabase.from("admins").select("user_id,email,role");
      if (emails.length > 0 && userIds.length > 0) adminQuery = adminQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) adminQuery = adminQuery.in("email", emails);
      else adminQuery = adminQuery.in("user_id", userIds);
      const { data: adminRows } = await adminQuery;
      (adminRows || []).forEach((item: any) => {
        if (item.email) roleByEmail[String(item.email).toLowerCase()] = item.role;
        if (item.user_id) roleByUserId[item.user_id] = item.role;
      });

      let profileQuery = supabase.from("volunteer_onboarding_submissions").select("user_id,email,photo_url,created_at");
      if (emails.length > 0 && userIds.length > 0) profileQuery = profileQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) profileQuery = profileQuery.in("email", emails);
      else profileQuery = profileQuery.in("user_id", userIds);
      const { data: profileRows } = await profileQuery.order("created_at", { ascending: false });
      (profileRows || []).forEach((item: any) => {
        if (item.email && !profileByEmail[String(item.email).toLowerCase()]) profileByEmail[String(item.email).toLowerCase()] = item;
        if (item.user_id && !profileByUserId[item.user_id]) profileByUserId[item.user_id] = item;
      });
    }

    return rows.map((member) => {
      const emailKey = String(member.email || "").toLowerCase();
      const profile = profileByUserId[member.user_id || ""] || profileByEmail[emailKey] || {};
      return {
        ...member,
        user_role: roleByUserId[member.user_id || ""] || roleByEmail[emailKey] || "",
        profile_photo_url: profile.photo_url || member.image || "",
        profile_created_at: profile.created_at || null,
      };
    });
  }

  async function loadData() {
    const modernResult = await supabase
      .from("radio_team_members")
      .select("id,name,title,segment_name,image,user_id,email,show_on_public_radio,created_by,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (modernResult.error) {
      const legacyResult = await supabase
        .from("radio_team_members")
        .select("id,name,title,segment_name,image,created_by,created_at")
        .order("created_at", { ascending: false });
      if (legacyResult.error) {
        setActionMessage(`Could not load radio team members: ${legacyResult.error.message}`);
        return;
      }
      setMembers(legacyResult.data || []);
      setActionMessage("Radio team loaded in legacy mode. Run the latest supabase/team-profile-enhancements.sql for linking and visibility.");
      return;
    }

    const enrichedMembers = await enrichMembers(modernResult.data || []);
    setMembers(enrichedMembers);

    const adminResult = await supabase.from("admins").select("user_id,email,role,created_at").order("created_at", { ascending: false });
    if (adminResult.error) {
      setActionMessage(`Could not load approved team users: ${adminResult.error.message}`);
      return;
    }

    const adminRows = (adminResult.data || [])
      .filter((item: any) => item.email && roleCanBeTeamMember(item.role))
      .map((item: any) => ({ ...item, email: String(item.email || "").toLowerCase() }));

    const emails = Array.from(new Set(adminRows.map((item: any) => item.email).filter(Boolean)));
    const userIds = Array.from(new Set(adminRows.map((item: any) => item.user_id).filter(Boolean))) as string[];
    const profileByEmail: Record<string, any> = {};
    const profileByUserId: Record<string, any> = {};

    if (emails.length > 0 || userIds.length > 0) {
      let profileQuery = supabase.from("volunteer_onboarding_submissions").select("user_id,email,full_name,photo_url,created_at");
      if (emails.length > 0 && userIds.length > 0) profileQuery = profileQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) profileQuery = profileQuery.in("email", emails);
      else profileQuery = profileQuery.in("user_id", userIds);
      const { data: profileRows } = await profileQuery.order("created_at", { ascending: false });
      (profileRows || []).forEach((item: any) => {
        if (item.email && !profileByEmail[String(item.email).toLowerCase()]) profileByEmail[String(item.email).toLowerCase()] = item;
        if (item.user_id && !profileByUserId[item.user_id]) profileByUserId[item.user_id] = item;
      });
    }

    const linkedEmails = new Set(enrichedMembers.map((member) => String(member.email || "").toLowerCase()).filter(Boolean));
    const linkedUserIds = new Set(enrichedMembers.map((member) => member.user_id).filter(Boolean));
    const seen = new Set<string>();

    setApprovedUsers(adminRows.filter((item: any) => {
      const key = item.email || item.user_id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((item: any) => {
      const profile = profileByUserId[item.user_id || ""] || profileByEmail[item.email] || {};
      return {
        user_id: item.user_id || profile.user_id || null,
        email: item.email,
        role: item.role || "team_member",
        full_name: profile.full_name || null,
        photo_url: profile.photo_url || null,
        profile_created_at: profile.created_at || null,
        already_radio: linkedEmails.has(item.email) || linkedUserIds.has(item.user_id),
      };
    }));
  }

  async function init() {
    setLoading(true);
    setMessage("Checking access...");
    const sessionResult = await supabase.auth.getSession();
    const currentUser = sessionResult.data?.session?.user || null;
    setUser(currentUser);

    if (!currentUser) {
      setRole("");
      setMembers([]);
      setMessage("Please login to access Studio Radio Team.");
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

    await loadData();
    setMessage("");
    setLoading(false);
  }

  function startEdit(member: RadioTeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      title: member.title || "",
      segment_name: member.segment_name || "",
      image: member.image || "",
      show_on_public_radio: member.show_on_public_radio !== false,
    });
    setLinkEmail(member.email || "");
    setActionMessage(`Editing ${member.name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startFromApprovedUser(item: ApprovedUser) {
    setEditingId(null);
    setLinkEmail(item.email);
    setForm({
      name: item.full_name || item.email,
      title: "Radio Team",
      segment_name: "",
      image: item.photo_url || "",
      show_on_public_radio: true,
    });
    setActionMessage(`Publishing ${item.full_name || item.email} to Radio Team`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setLinkEmail("");
    setForm(emptyForm());
    setActionMessage("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, "Radio team image", 5);
    if (!validation.ok) {
      setActionMessage(validation.message || "Please upload a valid image file.");
      event.target.value = "";
      return;
    }
    if (!cloudinaryReady) {
      setActionMessage("Cloudinary is not configured. Image URL still works.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setActionMessage("Uploading image...");
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadForm.append("folder", "seattle-desi-tv/radio-team");
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: uploadForm });
      const result = await response.json();
      if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Upload failed.");
      setForm((current) => ({ ...current, image: result.secure_url }));
      setActionMessage("Image uploaded. Save to keep it.");
    } catch (error: any) {
      setActionMessage(`Image upload failed: ${error?.message || String(error)}`);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function saveMember() {
    const validationError = firstError(
      requireText(form.name, "Name", 2),
      validateOptionalUrl(form.image, "Radio team image URL")
    );
    if (validationError) {
      setActionMessage(validationError);
      return;
    }

    const selectedUser = selectedApprovedUser;
    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim(),
      segment_name: form.segment_name.trim(),
      image: form.image.trim(),
      show_on_public_radio: form.show_on_public_radio,
      updated_at: new Date().toISOString(),
    };

    if (selectedUser) {
      if (!selectedUser.user_id) {
        setActionMessage("Selected user is missing user_id. Re-approve Team Access from Volunteer Requests and try again.");
        return;
      }
      payload.user_id = selectedUser.user_id;
      payload.email = selectedUser.email.toLowerCase();
    }

    setSaving(true);
    setActionMessage(editingId ? "Updating radio team member..." : "Adding radio team member...");

    let result;
    if (editingId) {
      result = await supabase.from("radio_team_members").update(payload).eq("id", editingId);
    } else {
      payload.created_by = user?.id || null;
      result = await supabase.from("radio_team_members").insert(payload);
    }

    if (result.error && String(result.error.message || "").includes("updated_at")) {
      delete payload.updated_at;
      result = editingId
        ? await supabase.from("radio_team_members").update(payload).eq("id", editingId)
        : await supabase.from("radio_team_members").insert(payload);
    }

    if (result.error) {
      setActionMessage(`Save failed: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setActionMessage(editingId ? "Radio team member updated." : "Radio team member added.");
    resetForm();
    await loadData();
    setSaving(false);
  }

  async function toggleVisibility(member: RadioTeamMember) {
    setActionMessage("Updating radio public visibility...");
    const nextVisible = member.show_on_public_radio === false;
    const { error } = await supabase.from("radio_team_members").update({ show_on_public_radio: nextVisible, updated_at: new Date().toISOString() }).eq("id", member.id);
    if (error) {
      setActionMessage(`Visibility update failed: ${error.message}`);
      return;
    }
    setActionMessage(nextVisible ? "Radio member is now visible publicly." : "Radio member is now hidden publicly.");
    await loadData();
  }

  async function deleteMember(member: RadioTeamMember) {
    const ok = window.confirm(`Delete radio team member: ${member.name}? This cannot be undone.`);
    if (!ok) return;
    setActionMessage("Deleting radio team member...");
    const { error } = await supabase.from("radio_team_members").delete().eq("id", member.id);
    if (error) {
      setActionMessage(`Delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Radio team member deleted.");
    await loadData();
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY)
        .forEach((key) => localStorage.removeItem(key));
    } catch {}
    window.location.href = "/login";
  }

  useEffect(() => { init(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Radio Team Management</h1>
            <p className="text-slate-300 mt-2">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio radio team"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}
        {!loading && !canAccess && <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl"><h2 className="text-2xl font-black">Access Required</h2><p className="text-gray-600 mt-3">{message}</p><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}

        {!loading && canAccess && (
          <div className="space-y-8">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">{editingId ? "Edit Radio Team Member" : "Add / Publish Radio Team Member"}</h2>
              {!editingMember?.user_id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-5">
                  <p className="font-black text-yellow-900">Connect to approved team user</p>
                  <p className="text-xs text-yellow-800 mt-1">This option only appears for new/unconnected radio profiles.</p>
                  <select className="border rounded-xl p-3 w-full bg-white mt-3" value={linkEmail} onChange={(event) => setLinkEmail(event.target.value)}>
                    <option value="">Manual radio profile / no user link</option>
                    {approvedUsers.map((item) => (
                      <option key={`${item.email}-${item.user_id || "no-id"}`} value={item.email}>
                        {item.full_name ? `${item.full_name} · ` : ""}{item.email} · {roleLabel(item.role)}{item.already_radio ? " · already in radio" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid md:grid-cols-[1fr_1fr_1fr_1.4fr] gap-4">
                <label className="grid gap-2 text-sm font-bold">Name<input className="border rounded-lg p-3 font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" /></label>
                <label className="grid gap-2 text-sm font-bold">Title / Role<input className="border rounded-lg p-3 font-normal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="RJ, Host, Producer..." /></label>
                <label className="grid gap-2 text-sm font-bold">Segment Name<input className="border rounded-lg p-3 font-normal" value={form.segment_name} onChange={(event) => setForm({ ...form, segment_name: event.target.value })} placeholder="Segment" /></label>
                <div className="grid gap-2 text-sm font-bold">Image<input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" /><input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="Or paste image URL" />{form.image && <img src={form.image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border" />}<p className="text-xs text-gray-500">Image files must be image type and 5MB or smaller. Pasted image URL must be valid.</p>{!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}</div>
              </div>
              <label className="mt-4 flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={form.show_on_public_radio} onChange={(event) => setForm({ ...form, show_on_public_radio: event.target.checked })} /> Show on public Radio page</label>
              <div className="flex flex-wrap gap-3 mt-5"><button onClick={saveMember} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Member" : "Add Member"}</button>{editingId && <button onClick={resetForm} className="border border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold">Cancel Edit</button>}</div>
            </section>

            {unlistedApprovedUsers.length > 0 && (
              <section className="bg-white text-slate-950 rounded-2xl p-6">
                <h2 className="text-2xl font-black">Approved Team Members Not on Radio Page</h2>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                  {unlistedApprovedUsers.map((item) => <article key={item.email} className="border rounded-xl p-4 flex gap-4 items-center"><ImageThumb src={item.photo_url || ""} label={item.full_name || item.email} /><div className="flex-1 min-w-0"><h3 className="font-black truncate">{item.full_name || item.email}</h3><p className="text-xs text-gray-600 break-words">{item.email}</p><p className="text-xs text-gray-600">{roleLabel(item.role)}</p><button onClick={() => startFromApprovedUser(item)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm mt-3">Publish to Radio Team</button></div></article>)}
                </div>
              </section>
            )}

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"><h2 className="text-2xl font-black">Radio Team</h2><p className="text-sm text-gray-500">Total: {members.length}</p></div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((member) => <article key={member.id} className="border rounded-xl p-4 flex gap-4 items-start"><ImageThumb src={member.profile_photo_url || member.image} label={member.name} /><div className="flex-1 min-w-0"><div className="flex gap-2 justify-between"><div><h3 className="text-lg font-black truncate">{member.name}</h3><p className="text-sm text-gray-600">{member.title || "No title"}</p><p className="text-sm font-bold text-pink-600 mt-1">{member.segment_name || "No segment"}</p></div><span className={`text-xs font-black rounded-full px-2 py-1 h-fit ${member.user_role ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{roleLabel(member.user_role)}</span></div><div className="mt-3 grid gap-1 text-xs text-gray-600 break-words"><p><b>Email:</b> {member.email || "Not linked"}</p><p><b>User ID:</b> {shortId(member.user_id)}</p><p><b>Public Radio:</b> {member.show_on_public_radio === false ? "Hidden" : "Visible"}</p></div><div className="flex flex-wrap gap-2 mt-4"><button onClick={() => startEdit(member)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</button><button onClick={() => toggleVisibility(member)} className="border border-slate-400 text-slate-700 px-3 py-2 rounded-lg font-bold text-sm">{member.show_on_public_radio === false ? "Show Publicly" : "Hide Publicly"}</button><button onClick={() => deleteMember(member)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button></div></div></article>)}
                {members.length === 0 && <p className="text-gray-500">No radio team members found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

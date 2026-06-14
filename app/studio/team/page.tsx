"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import StudioHeader from "../../components/StudioHeader";
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

type TeamMember = {
  id: string;
  name: string;
  title: string;
  image: string;
  user_id?: string | null;
  email?: string | null;
  show_on_public_team?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_role?: string;
  profile_photo_url?: string;
  profile_created_at?: string | null;
};

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
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

function roleLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "Not connected";
}

function ImageThumb({ src, label }: { src?: string; label: string }) {
  if (!src) return <div className="w-28 h-28 rounded-xl bg-pink-50 grid place-items-center text-pink-600 font-black text-xs text-center px-2">No image</div>;
  return <img src={src} alt={label} className="w-28 h-28 rounded-xl object-cover bg-gray-100 border" />;
}

function emptyForm() {
  return {
    name: "",
    title: "",
    image: "",
  };
}

export default function StudioTeamPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [actionMessage, setActionMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const canAccess = Boolean(user && roleContainsAdmin(role));
  const cloudinaryReady = Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
  const editingMember = members.find((member) => member.id === editingId) || null;

  async function enrichMembers(rows: TeamMember[]) {
    const emails = Array.from(new Set(rows.map((row) => String(row.email || "").toLowerCase()).filter(Boolean)));
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];

    const roleByEmail: Record<string, string> = {};
    const roleByUserId: Record<string, string> = {};
    if (emails.length > 0 || userIds.length > 0) {
      let adminQuery = supabase.from("admins").select("user_id,email,role");
      if (emails.length > 0 && userIds.length > 0) adminQuery = adminQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) adminQuery = adminQuery.in("email", emails);
      else adminQuery = adminQuery.in("user_id", userIds);
      const { data } = await adminQuery;
      (data || []).forEach((item: any) => {
        if (item.email) roleByEmail[String(item.email).toLowerCase()] = item.role;
        if (item.user_id) roleByUserId[item.user_id] = item.role;
      });
    }

    const profileByEmail: Record<string, any> = {};
    const profileByUserId: Record<string, any> = {};
    if (emails.length > 0 || userIds.length > 0) {
      let profileQuery = supabase.from("volunteer_onboarding_submissions").select("user_id,email,photo_url,created_at");
      if (emails.length > 0 && userIds.length > 0) profileQuery = profileQuery.or(`email.in.(${emails.join(",")}),user_id.in.(${userIds.join(",")})`);
      else if (emails.length > 0) profileQuery = profileQuery.in("email", emails);
      else profileQuery = profileQuery.in("user_id", userIds);
      const { data } = await profileQuery.order("created_at", { ascending: false });
      (data || []).forEach((item: any) => {
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

  async function loadMembers() {
    const modernResult = await supabase
      .from("team_members")
      .select("id,name,title,image,user_id,email,show_on_public_team,created_by,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (!modernResult.error) {
      setMembers(await enrichMembers(modernResult.data || []));
      return;
    }

    const legacyResult = await supabase
      .from("team_members")
      .select("id,name,title,image,created_by,created_at")
      .order("created_at", { ascending: false });

    if (legacyResult.error) {
      setActionMessage(`Could not load team members: ${legacyResult.error.message}`);
      return;
    }

    setActionMessage("Team members loaded in legacy mode. Run supabase/team-profile-enhancements.sql to show user role/email connections.");
    setMembers(legacyResult.data || []);
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
      setMessage("Please login to access Studio Team.");
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

    await loadMembers();
    setMessage("");
    setLoading(false);
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      title: member.title || "",
      image: member.image || "",
    });
    setActionMessage(`Editing ${member.name}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
    setActionMessage("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!cloudinaryReady) {
      setActionMessage("Cloudinary is not configured. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in Vercel.");
      return;
    }

    setUploadingImage(true);
    setActionMessage("Uploading image...");

    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadForm.append("folder", "seattle-desi-tv/team");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: uploadForm,
      });

      const result = await response.json();
      if (!response.ok || !result.secure_url) {
        throw new Error(result.error?.message || "Cloudinary upload failed.");
      }

      setForm((current) => ({ ...current, image: result.secure_url }));
      setActionMessage("Image uploaded. Save changes to keep it.");
    } catch (error: any) {
      setActionMessage(`Image upload failed: ${error?.message || String(error)}`);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function saveMember() {
    if (!editingId) {
      setActionMessage("Select a team member to edit first.");
      return;
    }
    if (!form.name.trim()) {
      setActionMessage("Name is required.");
      return;
    }

    setSaving(true);
    setActionMessage("Updating team member...");

    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim(),
      image: form.image.trim(),
      updated_at: new Date().toISOString(),
    };

    let result = await supabase.from("team_members").update(payload).eq("id", editingId);
    if (result.error && String(result.error.message || "").includes("updated_at")) {
      delete payload.updated_at;
      result = await supabase.from("team_members").update(payload).eq("id", editingId);
    }

    if (result.error) {
      setActionMessage(`Save failed: ${result.error.message}`);
      setSaving(false);
      return;
    }

    setActionMessage("Team member updated.");
    resetForm();
    await loadMembers();
    setSaving(false);
  }

  async function deleteMember(member: TeamMember) {
    const ok = window.confirm(`Delete team member: ${member.name}? This only removes them from the public Team page. It does not remove their login or team role.`);
    if (!ok) return;

    setActionMessage("Deleting team member...");
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);
    if (error) {
      setActionMessage(`Delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Team member removed from public Team page.");
    await loadMembers();
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

  useEffect(() => {
    init();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mt-3">Team Management</h1>
            <p className="text-slate-300 mt-2">{user?.email ? `Logged in as ${user.email} · Role: ${role || "none"}` : "Studio team"}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={init} className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Refresh</button>
            {user && <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout</button>}
          </div>
        </div>

        {loading && <div className="bg-white/10 border border-white/10 rounded-2xl p-6">{message}</div>}

        {!loading && !canAccess && (
          <div className="bg-white text-slate-950 rounded-2xl p-8 max-w-xl">
            <h2 className="text-2xl font-black">Access Required</h2>
            <p className="text-gray-600 mt-3">{message}</p>
            <a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a>
          </div>
        )}

        {!loading && canAccess && (
          <div className="space-y-8">
            {actionMessage && <div className="bg-yellow-100 text-yellow-900 rounded-2xl p-4 font-bold">{actionMessage}</div>}

            {editingMember ? (
              <section className="bg-white text-slate-950 rounded-2xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="shrink-0">
                    <p className="text-xs font-black uppercase text-gray-500 mb-2">Profile / ID Image</p>
                    <ImageThumb src={form.image || editingMember.profile_photo_url || editingMember.image} label={editingMember.name} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
                      <div>
                        <h2 className="text-2xl font-black">Edit Team Member</h2>
                        <p className="text-gray-600 text-sm mt-1">Edit the public Team page profile. User role/access is shown for reference and is managed from volunteer approval/admin access.</p>
                      </div>
                      <span className={`text-xs font-black rounded-full px-3 py-2 w-fit ${editingMember.user_role ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{roleLabel(editingMember.user_role)}</span>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5 text-xs text-gray-600">
                      <div className="bg-slate-50 rounded-xl p-3"><b>Email</b><p className="break-words mt-1">{editingMember.email || "Not linked"}</p></div>
                      <div className="bg-slate-50 rounded-xl p-3"><b>User ID</b><p className="break-words mt-1">{shortId(editingMember.user_id)}</p></div>
                      <div className="bg-slate-50 rounded-xl p-3"><b>Team row created</b><p className="mt-1">{formatDate(editingMember.created_at)}</p></div>
                      <div className="bg-slate-50 rounded-xl p-3"><b>User profile created</b><p className="mt-1">{formatDate(editingMember.profile_created_at)}</p></div>
                      <div className="bg-slate-50 rounded-xl p-3"><b>Public Team</b><p className="mt-1">{editingMember.show_on_public_team === false ? "Hidden" : "Visible"}</p></div>
                      <div className="bg-slate-50 rounded-xl p-3"><b>Last updated</b><p className="mt-1">{formatDate(editingMember.updated_at)}</p></div>
                    </div>

                    <div className="grid md:grid-cols-[1fr_1fr_1.4fr] gap-4">
                      <label className="grid gap-2 text-sm font-bold">
                        Name
                        <input className="border rounded-lg p-3 font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Team member name" />
                      </label>
                      <label className="grid gap-2 text-sm font-bold">
                        Title / Role Display
                        <input className="border rounded-lg p-3 font-normal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Founder, Host, Volunteer..." />
                      </label>
                      <div className="grid gap-2 text-sm font-bold">
                        Team Page / ID Image
                        <input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" />
                        <input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="Or paste image URL" />
                        {!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-5">
                      <button onClick={saveMember} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60">{saving ? "Saving..." : "Update Member"}</button>
                      <button onClick={resetForm} className="border border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold">Cancel Edit</button>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-white text-slate-950 rounded-2xl p-6">
                <h2 className="text-2xl font-black">Team Profiles</h2>
                <p className="text-gray-600 mt-2">Team members should be added through <b>Studio → Volunteer Requests → Approve Team Access + Publish</b>. Use this page to edit already-published team profiles.</p>
              </section>
            )}

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-black">Team Members</h2>
                <p className="text-sm text-gray-500">Total: {members.length}</p>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((member) => (
                  <article key={member.id} className="border rounded-xl p-4 flex gap-4 items-start">
                    <ImageThumb src={member.profile_photo_url || member.image} label={member.name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-start justify-between">
                        <div>
                          <h3 className="text-lg font-black truncate">{member.name}</h3>
                          <p className="text-sm text-gray-600">{member.title || "No title"}</p>
                        </div>
                        <span className={`text-xs font-black rounded-full px-2 py-1 ${member.user_role ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{roleLabel(member.user_role)}</span>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-gray-600 break-words">
                        <p><b>Email:</b> {member.email || "Not linked"}</p>
                        <p><b>User ID:</b> {shortId(member.user_id)}</p>
                        <p><b>Team row created:</b> {formatDate(member.created_at)}</p>
                        <p><b>User profile created:</b> {formatDate(member.profile_created_at)}</p>
                        <p><b>Public Team:</b> {member.show_on_public_team === false ? "Hidden" : "Visible"}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => startEdit(member)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</button>
                        <button onClick={() => deleteMember(member)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Remove from Team Page</button>
                      </div>
                    </div>
                  </article>
                ))}
                {members.length === 0 && <p className="text-gray-500">No team members found.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

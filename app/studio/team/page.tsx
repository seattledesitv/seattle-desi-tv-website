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
  created_by?: string;
  created_at?: string;
};

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
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

  async function loadMembers() {
    const { data, error } = await supabase
      .from("team_members")
      .select("id,name,title,image,created_by,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setActionMessage(`Could not load team members: ${error.message}`);
      return;
    }

    setMembers(data || []);
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
      setActionMessage("Image uploaded. Save the team member to keep it.");
    } catch (error: any) {
      setActionMessage(`Image upload failed: ${error?.message || String(error)}`);
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function saveMember() {
    if (!form.name.trim()) {
      setActionMessage("Name is required.");
      return;
    }

    setSaving(true);
    setActionMessage(editingId ? "Updating team member..." : "Adding team member...");

    const payload: any = {
      name: form.name.trim(),
      title: form.title.trim(),
      image: form.image.trim(),
    };

    let error = null;

    if (editingId) {
      const result = await supabase.from("team_members").update(payload).eq("id", editingId);
      error = result.error;
    } else {
      payload.created_by = user?.id || null;
      const result = await supabase.from("team_members").insert(payload);
      error = result.error;
    }

    if (error) {
      setActionMessage(`Save failed: ${error.message}`);
      setSaving(false);
      return;
    }

    setActionMessage(editingId ? "Team member updated." : "Team member added.");
    resetForm();
    await loadMembers();
    setSaving(false);
  }

  async function deleteMember(member: TeamMember) {
    const ok = window.confirm(`Delete team member: ${member.name}? This cannot be undone.`);
    if (!ok) return;

    setActionMessage("Deleting team member...");
    const { error } = await supabase.from("team_members").delete().eq("id", member.id);
    if (error) {
      setActionMessage(`Delete failed: ${error.message}`);
      return;
    }
    setActionMessage("Team member deleted.");
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

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <h2 className="text-2xl font-black mb-4">{editingId ? "Edit Team Member" : "Add Team Member"}</h2>
              <div className="grid md:grid-cols-[1fr_1fr_1.4fr] gap-4">
                <label className="grid gap-2 text-sm font-bold">
                  Name
                  <input className="border rounded-lg p-3 font-normal" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Team member name" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Title / Role
                  <input className="border rounded-lg p-3 font-normal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Founder, Host, Volunteer..." />
                </label>
                <div className="grid gap-2 text-sm font-bold">
                  Image
                  <input type="file" accept="image/*" onChange={uploadImage} disabled={uploadingImage} className="border rounded-lg p-3 font-normal" />
                  <input className="border rounded-lg p-3 font-normal" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} placeholder="Or paste image URL" />
                  {form.image && <img src={form.image} alt="Preview" className="w-24 h-24 object-cover rounded-xl border" />}
                  {!cloudinaryReady && <p className="text-xs text-orange-600">Cloudinary upload is not configured; image URL still works.</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={saveMember} disabled={saving || uploadingImage} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-60">{saving ? "Saving..." : editingId ? "Update Member" : "Add Member"}</button>
                {editingId && <button onClick={resetForm} className="border border-gray-400 text-gray-700 px-5 py-3 rounded-xl font-bold">Cancel Edit</button>}
              </div>
            </section>

            <section className="bg-white text-slate-950 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-black">Team Members</h2>
                <p className="text-sm text-gray-500">Total: {members.length}</p>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {members.map((member) => (
                  <article key={member.id} className="border rounded-xl p-4 flex gap-4 items-center">
                    <ImageThumb src={member.image} label={member.name} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black truncate">{member.name}</h3>
                      <p className="text-sm text-gray-600">{member.title || "No title"}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button onClick={() => startEdit(member)} className="bg-slate-900 text-white px-3 py-2 rounded-lg font-bold text-sm">Edit</button>
                        <button onClick={() => deleteMember(member)} className="border border-red-600 text-red-600 px-3 py-2 rounded-lg font-bold text-sm">Delete</button>
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

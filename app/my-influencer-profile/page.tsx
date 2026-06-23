"use client";

import { useEffect, useState } from "react";
import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import SafeImage from "../components/SafeImage";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type FormState = {
  full_name: string;
  city: string;
  bio: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
  website_url: string;
  photo_url: string;
  niche: string;
  follower_count: string;
  public_listing: boolean;
};

const emptyForm: FormState = {
  full_name: "",
  city: "Washington",
  bio: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  website_url: "",
  photo_url: "",
  niche: "Community",
  follower_count: "",
  public_listing: false,
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return <label className="block text-sm font-black text-slate-900"><span>{label}</span>{children}{help && <p className="mt-1 text-xs font-normal text-slate-500">{help}</p>}</label>;
}

export default function MyInfluencerProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState("Loading influencer profile...");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string>("");
  const [approvalStatus, setApprovalStatus] = useState("pending");

  async function load() {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser?.email) {
      setStatus("Please login to create your influencer profile.");
      return;
    }
    const { data: profile, error } = await supabase.from("influencer_profiles").select("*").ilike("email", currentUser.email).maybeSingle();
    if (error) {
      setStatus(`Could not load influencer profile: ${error.message}`);
      return;
    }
    if (profile) {
      setExistingId(profile.id);
      setApprovalStatus(profile.status || "pending");
      setForm({
        full_name: profile.full_name || currentUser.email,
        city: profile.city || "Washington",
        bio: profile.bio || "",
        instagram_url: profile.instagram_url || "",
        tiktok_url: profile.tiktok_url || "",
        youtube_url: profile.youtube_url || "",
        website_url: profile.website_url || "",
        photo_url: profile.photo_url || "",
        niche: profile.niche || "Community",
        follower_count: profile.follower_count || "",
        public_listing: Boolean(profile.public_listing),
      });
      setStatus("Influencer profile loaded.");
    } else {
      setForm({ ...emptyForm, full_name: currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "" });
      setStatus("Create your influencer profile. Admin approval is required before it appears publicly.");
    }
  }

  async function save() {
    if (!user?.email) { setStatus("Please login first."); return; }
    if (!form.full_name.trim()) { setStatus("Display name is required."); return; }
    setSaving(true);
    setStatus("Saving...");
    const payload = {
      user_id: user.id,
      email: user.email,
      full_name: form.full_name.trim(),
      city: form.city.trim() || "Washington",
      bio: form.bio.trim() || null,
      instagram_url: normalizeUrl(form.instagram_url) || null,
      tiktok_url: normalizeUrl(form.tiktok_url) || null,
      youtube_url: normalizeUrl(form.youtube_url) || null,
      website_url: normalizeUrl(form.website_url) || null,
      photo_url: normalizeUrl(form.photo_url) || null,
      niche: form.niche.trim() || null,
      follower_count: form.follower_count.trim() || null,
      public_listing: form.public_listing,
      status: existingId && approvalStatus === "approved" ? "approved" : "pending",
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("influencer_profiles").upsert(payload, { onConflict: "email" }).select("id,status").single();
    if (error) {
      setStatus(`Could not save influencer profile: ${error.message}`);
    } else {
      setExistingId(data?.id || existingId);
      setApprovalStatus(data?.status || "pending");
      setStatus("Influencer profile saved. Admin approval is required before public listing.");
    }
    setSaving(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/10 p-8">
          <p className="font-black uppercase tracking-wide text-pink-300">SDTV Influencer Network</p>
          <h1 className="mt-2 text-4xl font-black md:text-5xl">My Influencer Profile</h1>
          <p className="mt-3 max-w-3xl text-slate-300">Create your influencer badge and opt in to the public Washington influencer directory. This can be used by general public members or SDTV team members.</p>
          <p className="mt-3 text-sm font-bold text-yellow-200">Status: {approvalStatus}</p>
        </div>

        {!user ? <div className="rounded-3xl bg-white p-8 text-slate-950"><h2 className="text-2xl font-black">Login required</h2><p className="mt-2 text-slate-600">Login to create your influencer profile.</p><a href="/login" className="mt-5 inline-block rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Login</a></div> : <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Display name"><input className="mt-1 w-full rounded-xl border p-3" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
              <Field label="City"><input className="mt-1 w-full rounded-xl border p-3" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
              <Field label="Niche"><input className="mt-1 w-full rounded-xl border p-3" placeholder="Food, Events, Fashion, Community..." value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} /></Field>
              <Field label="Follower count"><input className="mt-1 w-full rounded-xl border p-3" placeholder="Example: 10K+" value={form.follower_count} onChange={(e) => setForm({ ...form, follower_count: e.target.value })} /></Field>
              <Field label="Instagram URL"><input className="mt-1 w-full rounded-xl border p-3" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} /></Field>
              <Field label="TikTok URL"><input className="mt-1 w-full rounded-xl border p-3" value={form.tiktok_url} onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })} /></Field>
              <Field label="YouTube URL"><input className="mt-1 w-full rounded-xl border p-3" value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} /></Field>
              <Field label="Website URL"><input className="mt-1 w-full rounded-xl border p-3" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} /></Field>
              <div className="md:col-span-2"><Field label="Profile photo URL" help="Use a public image URL for now. Upload support can be added later."><input className="mt-1 w-full rounded-xl border p-3" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} /></Field></div>
              <div className="md:col-span-2"><Field label="Short bio"><textarea className="mt-1 min-h-28 w-full rounded-xl border p-3" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field></div>
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-2xl border bg-slate-50 p-4 text-sm font-bold"><input type="checkbox" className="mt-1" checked={form.public_listing} onChange={(e) => setForm({ ...form, public_listing: e.target.checked })} /><span>Show me on the public “Influencers in Washington” page after admin approval.</span></label>
            <button onClick={save} disabled={saving} className="mt-5 w-full rounded-xl bg-pink-600 px-5 py-4 font-black text-white disabled:opacity-60">{saving ? "Saving..." : "Save Influencer Profile"}</button>
            {status && <p className="mt-4 text-sm font-bold text-orange-700">{status}</p>}
          </section>

          <aside className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
            <h2 className="text-2xl font-black">Preview</h2>
            <div className="mt-5 rounded-3xl border p-5 text-center">
              <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-pink-50">
                {form.photo_url ? <SafeImage src={form.photo_url} alt={form.full_name} className="h-full w-full object-cover" fallbackClassName="grid h-full w-full place-items-center text-2xl font-black text-pink-600" fallbackLabel={form.full_name.charAt(0) || "I"} widthHint={420} /> : <div className="grid h-full w-full place-items-center text-2xl font-black text-pink-600">{form.full_name.charAt(0) || "I"}</div>}
              </div>
              <h3 className="mt-4 text-xl font-black">{form.full_name || "Influencer Name"}</h3>
              <p className="text-sm text-slate-500">{form.city || "Washington"}</p>
              <p className="mt-3 text-sm text-slate-600">{form.bio || "Short bio appears here."}</p>
            </div>
          </aside>
        </div>}
      </div>
      <SiteFooter />
    </main>
  );
}

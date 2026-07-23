"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();
const groupUrl = "https://chat.whatsapp.com/FOP04oZJWEOLgTMJVJPiVt";

type Member = {
  id: string;
  user_id?: string | null;
  email?: string | null;
  name?: string | null;
  title?: string | null;
  image?: string | null;
  created_at?: string | null;
  full_name?: string | null;
  preferred_name?: string | null;
  short_bio?: string | null;
  profile_photo_url?: string | null;
  id_badge_url?: string | null;
};

type Welcome = {
  email: string;
  whatsapp_invite_sent_at?: string | null;
  whatsapp_joined_at?: string | null;
  team_intro_shared_at?: string | null;
  instagram_posted_at?: string | null;
  completed_at?: string | null;
};

function cleanEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function displayName(member: Member) {
  return member.preferred_name || member.full_name || member.name || member.email || "Team member";
}

function roleLabel(member: Member) {
  return member.title || "Team Member";
}

function bioText(member: Member) {
  return String(member.short_bio || "").trim();
}

function memberImage(member: Member) {
  return member.id_badge_url || member.profile_photo_url || member.image || "";
}

function introMessage(member: Member) {
  const name = displayName(member);
  return [
    "🎉 Please join us in welcoming our newest Seattle Desi TV team member!",
    "",
    `🌟 ${name}`,
    `Role: ${roleLabel(member)}`,
    bioText(member) ? "" : null,
    bioText(member) || null,
    "",
    `Welcome to the SDTV family, ${name}! We are excited to have you with us and look forward to creating meaningful community stories together.`,
  ].filter(Boolean).join("\n");
}

function instagramCaption(member: Member) {
  const name = displayName(member);
  return [
    "🎉 Welcome to the Seattle Desi TV family!",
    "",
    `Please join us in welcoming ${name} as a ${roleLabel(member)}.`,
    bioText(member) ? "" : null,
    bioText(member) || null,
    "",
    `Welcome aboard, ${name}! We are excited to have you join our mission of celebrating culture, community, and local stories.`,
    "",
    "#SeattleDesiTV #SDTVTeam #Volunteer #Community #SeattleDesiCommunity",
  ].filter(Boolean).join("\n");
}

export default function TeamWelcomePage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Checking access...");
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [welcomes, setWelcomes] = useState<Record<string, Welcome>>({});
  const [selectedEmail, setSelectedEmail] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    const [teamResult, profileResult, welcomeResult] = await Promise.all([
      supabase.from("team_members").select("*").order("created_at", { ascending: false }),
      supabase.from("user_profiles").select("user_id,email,full_name,preferred_name,short_bio,profile_photo_url,id_badge_url"),
      supabase.from("team_member_welcomes").select("*"),
    ]);

    if (teamResult.error) throw teamResult.error;
    if (profileResult.error) throw profileResult.error;
    if (welcomeResult.error) throw welcomeResult.error;

    const profileRows = profileResult.data || [];
    const merged: Member[] = (teamResult.data || []).map((member: any) => {
      const email = cleanEmail(member.email || member.user_email);
      const userId = member.user_id || member.linked_user || null;
      const profile = profileRows.find((row: any) =>
        (userId && row.user_id === userId) || (email && cleanEmail(row.email) === email)
      );
      return {
        ...member,
        ...profile,
        user_id: userId,
        email: email || cleanEmail(profile?.email),
      };
    }).filter((member: Member) => Boolean(member.email));

    const welcomeMap: Record<string, Welcome> = {};
    (welcomeResult.data || []).forEach((row: Welcome) => {
      welcomeMap[cleanEmail(row.email)] = row;
    });

    setMembers(merged);
    setWelcomes(welcomeMap);
    setSelectedEmail((current) => current || cleanEmail(merged[0]?.email));
  }

  async function init() {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) throw new Error("Please log in as a Studio admin.");
      const role = await resolveUserRole(supabase, user);
      if (!isAdminRole(role)) throw new Error("Studio admin access is required.");
      setAllowed(true);
      await load();
      setMessage("");
    } catch (error: any) {
      setMessage(error?.message || "Could not load Team Welcome Center.");
    } finally {
      setLoading(false);
    }
  }

  async function saveStep(member: Member, field: Exclude<keyof Welcome, "email">) {
    const email = cleanEmail(member.email);
    if (!email) return;
    setBusy(true);
    setMessage("");

    const value = new Date().toISOString();
    const current: Welcome = welcomes[email] || { email };
    const next: Welcome = { ...current, [field]: value };
    const complete = Boolean(
      next.whatsapp_invite_sent_at &&
      next.whatsapp_joined_at &&
      next.team_intro_shared_at &&
      next.instagram_posted_at
    );
    const { data: auth } = await supabase.auth.getUser();

    const payload = {
      email,
      user_id: member.user_id || null,
      team_member_id: member.id,
      [field]: value,
      completed_at: complete ? (next.completed_at || value) : next.completed_at || null,
      completed_by: complete ? auth?.user?.id || null : null,
      updated_at: value,
    };

    const { error } = await supabase.from("team_member_welcomes").upsert(payload, { onConflict: "email" });
    if (error) {
      setMessage(`Could not save welcome progress: ${error.message}`);
    } else {
      setWelcomes((existing) => ({
        ...existing,
        [email]: { ...next, completed_at: complete ? (next.completed_at || value) : next.completed_at },
      }));
      setMessage("Welcome progress updated.");
    }
    setBusy(false);
  }

  async function sendInvite(member: Member) {
    const email = cleanEmail(member.email);
    if (!email) return;
    setBusy(true);
    setMessage("");

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || "";
    const name = displayName(member);
    const text = [
      `Hi ${name},`,
      "",
      "Welcome to Seattle Desi TV!",
      "",
      "Please join our official SDTV Team WhatsApp group using the link below:",
      groupUrl,
      "",
      "Once you have joined, we will introduce you to the team.",
      "",
      "Welcome aboard!",
      "Seattle Desi TV",
    ].join("\n");

    const response = await fetch("/api/studio/send-communication", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
      body: JSON.stringify({
        recipients: [{ email, user_id: member.user_id || null, name }],
        subject: "Welcome to SDTV – Join the Team WhatsApp Group",
        message: text,
        notificationTitle: "Join the SDTV Team WhatsApp Group",
        notificationLink: groupUrl,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.error) {
      setMessage(json.error || "Could not send invitation.");
      setBusy(false);
      return;
    }

    setBusy(false);
    await saveStep(member, "whatsapp_invite_sent_at");
  }

  async function copy(text: string, success: string) {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  }

  function openInstagram(member: Member) {
    const params = new URLSearchParams({
      imageUrl: memberImage(member),
      caption: instagramCaption(member),
      postContext: `Welcome ${displayName(member)} to the Seattle Desi TV team`,
    });
    window.location.href = `/studio/instagram-publisher?${params.toString()}`;
  }

  useEffect(() => {
    init();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) =>
      `${displayName(member)} ${member.email || ""} ${member.title || ""}`.toLowerCase().includes(query)
    );
  }, [members, search]);

  const selected = members.find((member) => cleanEmail(member.email) === selectedEmail) || null;
  const status: Welcome | null = selected
    ? welcomes[cleanEmail(selected.email)] || { email: cleanEmail(selected.email) }
    : null;
  const completedSteps = status
    ? [status.whatsapp_invite_sent_at, status.whatsapp_joined_at, status.team_intro_shared_at, status.instagram_posted_at].filter(Boolean).length
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <StudioHeader />
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">People</p>
          <h1 className="mt-2 text-4xl font-black">Team Welcome Center</h1>
          <p className="mt-2 max-w-3xl text-slate-300">Invite new members to WhatsApp, introduce them to the team, and prepare their Instagram welcome using their existing bio and ID badge.</p>
        </div>

        {message && <div className="mb-5 rounded-2xl bg-white/10 p-4 font-bold">{message}</div>}
        {loading && <div className="rounded-3xl bg-white/10 p-8">Loading...</div>}
        {!loading && !allowed && <div className="rounded-3xl bg-white p-8 text-slate-950">Admin access required.</div>}

        {!loading && allowed && (
          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <aside className="rounded-[2rem] bg-white p-5 text-slate-950">
              <h2 className="text-2xl font-black">Team Members</h2>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team members..." className="mt-4 w-full rounded-xl border p-3" />
              <div className="mt-4 grid max-h-[720px] gap-3 overflow-y-auto">
                {filtered.map((member) => {
                  const memberStatus: Welcome = welcomes[cleanEmail(member.email)] || { email: cleanEmail(member.email) };
                  const count = [memberStatus.whatsapp_invite_sent_at, memberStatus.whatsapp_joined_at, memberStatus.team_intro_shared_at, memberStatus.instagram_posted_at].filter(Boolean).length;
                  return (
                    <button key={member.id} onClick={() => setSelectedEmail(cleanEmail(member.email))} className={`rounded-2xl border p-4 text-left ${selectedEmail === cleanEmail(member.email) ? "border-pink-500 bg-pink-50" : "bg-white"}`}>
                      <div className="flex gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-full bg-slate-100">{memberImage(member) && <img src={memberImage(member)} alt="" className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0">
                          <p className="truncate font-black">{displayName(member)}</p>
                          <p className="truncate text-xs text-slate-500">{member.email}</p>
                          <p className="mt-1 text-xs font-bold text-pink-600">{count}/4 complete</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="text-slate-950">
              {selected && status ? (
                <div className="space-y-5">
                  <div className="rounded-[2rem] bg-white p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div className="flex gap-4">
                        <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-100">{memberImage(selected) && <img src={memberImage(selected)} alt="" className="h-full w-full object-cover" />}</div>
                        <div>
                          <p className="text-xs font-black uppercase text-pink-600">Selected Team Member</p>
                          <h2 className="text-3xl font-black">{displayName(selected)}</h2>
                          <p className="text-slate-500">{roleLabel(selected)} · {selected.email}</p>
                          <p className={`mt-2 text-sm font-black ${bioText(selected) ? "text-green-700" : "text-orange-600"}`}>{bioText(selected) ? "Bio available" : "Bio missing – update it in User Control"}</p>
                          <p className={`mt-1 text-sm font-black ${selected.id_badge_url ? "text-green-700" : "text-orange-600"}`}>{selected.id_badge_url ? "ID badge available" : "ID badge missing – generate it from ID Badges"}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl bg-slate-100 px-6 py-4 text-center">
                        <p className="text-3xl font-black">{completedSteps}/4</p>
                        <p className="text-xs font-black uppercase text-slate-500">Welcome steps</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <article className="rounded-[2rem] bg-white p-6">
                      <p className="text-xs font-black uppercase text-pink-600">Step 1</p>
                      <h3 className="mt-1 text-2xl font-black">WhatsApp Invitation</h3>
                      <p className="mt-2 text-sm text-slate-600">Email the member the official SDTV Team WhatsApp group link.</p>
                      <button onClick={() => sendInvite(selected)} disabled={busy} className="mt-5 rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-50">{status.whatsapp_invite_sent_at ? "Resend Invitation Email" : "Send Invitation Email"}</button>
                      {status.whatsapp_invite_sent_at && <p className="mt-3 text-sm font-bold text-green-700">✓ Invitation sent</p>}
                    </article>

                    <article className="rounded-[2rem] bg-white p-6">
                      <p className="text-xs font-black uppercase text-pink-600">Step 2</p>
                      <h3 className="mt-1 text-2xl font-black">Confirm Joined</h3>
                      <p className="mt-2 text-sm text-slate-600">Confirm the member joined the group, then record it here.</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <a href={groupUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Open WhatsApp Group</a>
                        <button onClick={() => saveStep(selected, "whatsapp_joined_at")} disabled={busy} className="rounded-xl bg-green-600 px-4 py-3 font-black text-white disabled:opacity-50">{status.whatsapp_joined_at ? "Joined ✓" : "Mark as Joined"}</button>
                      </div>
                    </article>

                    <article className="rounded-[2rem] bg-white p-6">
                      <p className="text-xs font-black uppercase text-pink-600">Step 3</p>
                      <h3 className="mt-1 text-2xl font-black">Team Introduction</h3>
                      <textarea readOnly value={introMessage(selected)} className="mt-4 min-h-64 w-full rounded-xl border bg-slate-50 p-4 text-sm" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => copy(introMessage(selected), "Team introduction copied.")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Copy Message</button>
                        <a href={groupUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-3 font-black text-white">Open Group</a>
                        <button onClick={() => saveStep(selected, "team_intro_shared_at")} disabled={busy} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-50">{status.team_intro_shared_at ? "Shared ✓" : "Mark Shared"}</button>
                      </div>
                    </article>

                    <article className="rounded-[2rem] bg-white p-6">
                      <p className="text-xs font-black uppercase text-pink-600">Step 4</p>
                      <h3 className="mt-1 text-2xl font-black">Instagram Welcome</h3>
                      <p className="mt-2 text-sm text-slate-600">Uses the existing ID badge first, with the profile image as a fallback.</p>
                      {memberImage(selected) && <img src={memberImage(selected)} alt="Welcome asset" className="mt-4 max-h-72 w-full rounded-2xl border bg-slate-50 object-contain" />}
                      {!memberImage(selected) && <a href="/studio/id-badges" className="mt-4 inline-flex rounded-xl bg-orange-100 px-4 py-3 font-black text-orange-800">Open ID Badge Generator</a>}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => openInstagram(selected)} disabled={!memberImage(selected)} className="rounded-xl bg-pink-600 px-4 py-3 font-black text-white disabled:opacity-40">Open in Instagram Publisher</button>
                        <button onClick={() => copy(instagramCaption(selected), "Instagram caption copied.")} className="rounded-xl bg-slate-900 px-4 py-3 font-black text-white">Copy Caption</button>
                        <button onClick={() => saveStep(selected, "instagram_posted_at")} disabled={busy} className="rounded-xl bg-green-600 px-4 py-3 font-black text-white disabled:opacity-50">{status.instagram_posted_at ? "Posted ✓" : "Mark Posted"}</button>
                      </div>
                    </article>
                  </div>
                </div>
              ) : (
                <div className="rounded-[2rem] bg-white p-8">Select a team member.</div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

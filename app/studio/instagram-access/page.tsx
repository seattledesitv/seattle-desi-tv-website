"use client";

import { useEffect, useMemo, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import { forSite } from "../../lib/sites/query";

const supabase = getSupabaseBrowserClient();

type Member = { id: string; user_id?: string | null; name?: string | null; email?: string | null; title?: string | null };
type Grant = { id: string; user_id?: string | null; email?: string | null; created_at: string };

export default function InstagramAccessPage() {
  const site = useCurrentSite();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("Loading publishing access...");
  const [members, setMembers] = useState<Member[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    const role = await resolveUserRole(supabase, user);
    const canManage = Boolean(user && isAdminRole(role));
    setAllowed(canManage);
    if (!canManage || !site.id) {
      setMessage(user ? "Admin access is required to manage publishing access." : "Please log in as an administrator.");
      setLoading(false);
      return;
    }
    const [memberResult, grantResult] = await Promise.all([
      forSite(supabase.from("team_members").select("id,user_id,name,email,title").order("name"), site.id),
      supabase.from("instagram_publisher_access").select("id,user_id,email,created_at").eq("site_id", site.id).order("created_at", { ascending: false }),
    ]);
    if (memberResult.error || grantResult.error) {
      setMessage(memberResult.error?.message || grantResult.error?.message || "Could not load publishing access.");
    } else {
      setMembers((memberResult.data || []).filter((member: Member) => member.user_id || member.email));
      setGrants(grantResult.data || []);
      setMessage("");
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [site.id]);

  const grantedKeys = useMemo(() => new Set(grants.flatMap((grant) => [grant.user_id ? `u:${grant.user_id}` : "", grant.email ? `e:${grant.email.toLowerCase()}` : ""]).filter(Boolean)), [grants]);
  function memberKey(member: Member) { return member.user_id ? `u:${member.user_id}` : `e:${String(member.email || "").toLowerCase()}`; }
  function grantFor(member: Member) { return grants.find((grant) => (member.user_id && grant.user_id === member.user_id) || (member.email && grant.email?.toLowerCase() === member.email.toLowerCase())); }

  async function toggle(member: Member) {
    if (!site.id) return;
    const key = memberKey(member);
    setSaving(key);
    setMessage("");
    const existing = grantFor(member);
    if (existing) {
      const result = await supabase.from("instagram_publisher_access").delete().eq("id", existing.id).eq("site_id", site.id);
      if (result.error) setMessage(result.error.message);
      else setMessage(`Removed Instagram publishing access for ${member.name || member.email}.`);
    } else {
      const { data } = await supabase.auth.getUser();
      const result = await supabase.from("instagram_publisher_access").insert({ site_id: site.id, user_id: member.user_id || null, email: member.email || null, granted_by: data.user?.id || null });
      if (result.error) setMessage(result.error.message);
      else setMessage(`Granted Instagram publishing access to ${member.name || member.email}.`);
    }
    setSaving("");
    await load();
  }

  return <main className="min-h-screen bg-slate-950 text-white">
    <StudioHeader />
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm font-black uppercase tracking-[0.25em] text-pink-300">Publishing Administration</p>
      <h1 className="mt-2 text-4xl font-black">Instagram Publisher Access</h1>
      <p className="mt-3 max-w-3xl text-slate-300">Choose which team members may publish live content to the connected Seattle Desi TV and Seattle Desi Radio Instagram accounts. Studio administrators always retain access.</p>
      {message && <div className="mt-6 rounded-2xl bg-white/10 p-4 font-bold">{message}</div>}
      {loading && <div className="mt-6 rounded-2xl bg-white/10 p-6 font-bold">Loading...</div>}
      {!loading && allowed && <section className="mt-8 overflow-hidden rounded-3xl bg-white text-slate-950 shadow-2xl">
        <div className="border-b border-slate-200 p-6"><h2 className="text-2xl font-black">Team members</h2><p className="mt-1 text-sm text-slate-600">Access is specific to {site.name}.</p></div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => {
            const key = memberKey(member);
            const hasAccess = grantedKeys.has(key);
            return <div key={member.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-lg font-black">{member.name || member.email || "Team member"}</p><p className="text-sm text-slate-600">{[member.title, member.email].filter(Boolean).join(" · ")}</p></div>
              <button type="button" disabled={saving === key} onClick={() => void toggle(member)} className={`rounded-xl px-5 py-3 font-black text-white disabled:opacity-50 ${hasAccess ? "bg-red-700" : "bg-pink-600"}`}>{saving === key ? "Saving..." : hasAccess ? "Remove access" : "Grant access"}</button>
            </div>;
          })}
          {members.length === 0 && <div className="p-8 text-slate-500">No team members with a linked account or email were found.</div>}
        </div>
      </section>}
    </div>
  </main>;
}

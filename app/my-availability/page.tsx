"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { storageKey: AUTH_STORAGE_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

function todayIso() { return new Date().toISOString().split("T")[0]; }
function cleanRole(role: string) { return String(role || "general_public").toLowerCase().trim(); }
function isTeamRole(role: string) { const r = cleanRole(role); return r === "team_member" || r.includes("admin"); }

export default function MyAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking access...");
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState("general_public");
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState("available");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  const canUse = Boolean(user && isTeamRole(role));

  async function getUserRole(currentUser: any) {
    const adminResult = await supabase.from("admins").select("role").or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).maybeSingle();
    if (adminResult.data?.role) return cleanRole(adminResult.data.role);

    const requestResult = await supabase
      .from("user_role_requests")
      .select("approved_role,requested_role,status")
      .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return cleanRole(requestResult.data?.approved_role || requestResult.data?.requested_role || "general_public");
  }

  async function loadRows(currentUser: any) {
    if (!currentUser?.id) return;
    const { data, error } = await supabase.from("crew_availability").select("id,available_date,status,note").eq("user_id", currentUser.id).gte("available_date", todayIso()).order("available_date", { ascending: true });
    if (error) setMessage(`Could not load availability: ${error.message}`); else setRows(data || []);
  }

  async function init() {
    setLoading(true);
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || null;
    setUser(currentUser);
    if (!currentUser) { setMessage("Please login to manage availability."); setLoading(false); return; }
    const nextRole = await getUserRole(currentUser);
    setRole(nextRole);
    if (!isTeamRole(nextRole)) { setMessage(`This page is for approved SDTV team members. Current role: ${nextRole}`); setLoading(false); return; }
    await loadRows(currentUser);
    setMessage("");
    setLoading(false);
  }

  async function save() {
    if (!user?.id) return;
    setMessage("Saving...");
    const { error } = await supabase.from("crew_availability").upsert({ user_id: user.id, user_email: user.email || null, available_date: date, status, note: note || null, updated_at: new Date().toISOString() }, { onConflict: "user_id,available_date" });
    if (error) setMessage(`Save failed: ${error.message}`); else { setMessage("Availability saved."); setNote(""); await loadRows(user); }
  }

  useEffect(() => { init(); }, []);

  return <main className="min-h-screen bg-slate-950 text-white px-6 py-10"><div className="max-w-5xl mx-auto"><a href="/" className="text-pink-300 font-bold">← Back</a><h1 className="text-4xl font-black mt-3">My Availability</h1><p className="text-slate-300 mt-2">Logged in role: {role}</p><p className="text-slate-300 mt-2 mb-8">Mark when you can support SDTV coverage.</p>{loading && <div className="bg-white/10 rounded-2xl p-6">{message}</div>}{!loading && !canUse && <div className="bg-white text-slate-950 rounded-2xl p-8">{message}<br /><a href="/login" className="inline-block bg-pink-600 text-white px-5 py-3 rounded-xl font-bold mt-5">Go to Login</a></div>}{!loading && canUse && <div className="grid lg:grid-cols-[360px_1fr] gap-6"><section className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Add / Update</h2><input type="date" className="w-full border rounded-lg p-3 mb-3" value={date} onChange={(e) => setDate(e.target.value)} /><select className="w-full border rounded-lg p-3 mb-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="available">Available</option><option value="maybe">Maybe</option><option value="unavailable">Unavailable</option></select><textarea className="w-full border rounded-lg p-3 mb-3" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} /><button onClick={save} className="w-full bg-pink-600 text-white px-5 py-3 rounded-xl font-black">Save</button>{message && <p className="text-sm text-orange-600 mt-4">{message}</p>}</section><section className="bg-white text-slate-950 rounded-2xl p-6"><h2 className="text-2xl font-black mb-4">Upcoming</h2>{rows.map((row) => <div key={row.id} className="border rounded-xl p-4 mb-3"><p className="font-black">{row.available_date}</p><p>Status: <b>{row.status}</b></p>{row.note && <p className="text-sm text-gray-500">{row.note}</p>}</div>)}{rows.length === 0 && <p className="text-gray-500">No records yet.</p>}</section></div>}</div></main>;
}

"use client";

import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../lib/roles";

const supabase = getSupabaseBrowserClient();

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Session check timed out.")), ms);
    Promise.resolve(promise).then((value) => { clearTimeout(timer); resolve(value); }).catch((error) => { clearTimeout(timer); reject(error); });
  });
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking login...");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [requestedRole, setRequestedRole] = useState("general_public");
  const [roleRequestMessage, setRoleRequestMessage] = useState("");

  async function redirectForUser(user: any) {
    setLoading(true);
    setMessage("Redirecting...");
    const role = await resolveUserRole(supabase, user);
    window.location.assign(isAdminRole(role) ? "/studio" : "/");
  }

  async function signIn() {
    setMessage("");
    if (!email || !password) { setMessage("Please enter email and password."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setMessage(error.message); return; }
    if (data.user) { setCurrentUser(data.user); setMessage("Login successful. Redirecting..."); await redirectForUser(data.user); }
    else { setLoading(false); setMessage("Login completed but no user session was returned."); }
  }

  async function requestRole() {
    setRoleRequestMessage("");
    if (!currentUser?.email) { setRoleRequestMessage("Please login first."); return; }
    const safeRole = requestedRole === "team_member" ? "team_member" : "general_public";
    const { error } = await supabase.from("user_role_requests").insert({
      user_id: currentUser.id,
      email: currentUser.email,
      requested_role: safeRole,
      status: safeRole === "general_public" ? "approved" : "pending",
      approved_role: safeRole === "general_public" ? "general_public" : null,
    });
    if (error) { setRoleRequestMessage(`Role request failed: ${error.message}`); return; }
    setRoleRequestMessage(safeRole === "team_member" ? "Team member request submitted for admin approval." : "General public role request saved.");
  }

  async function cleanLogout() {
    setLoading(true);
    setMessage("Logging out...");
    try { await withTimeout(supabase.auth.signOut({ scope: "global" }), 2500); } catch {}
    try {
      Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    setCurrentUser(null); setPassword(""); setLoading(false); setCheckingSession(false); setMessage("Logged out. You can login again now."); window.history.replaceState({}, "", "/login");
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const { data } = await withTimeout(supabase.auth.getUser(), 2500);
        if (cancelled) return;
        const user = data?.user || null;
        setCurrentUser(user);
        if (user) { setEmail(user.email || ""); setMessage(`Already logged in as ${user.email}. Use Continue, Go to Studio, request role, or Logout below.`); }
        else setMessage("");
      } catch {
        if (cancelled) return;
        setCurrentUser(null); setMessage("No active login found. Please login below.");
      } finally { if (!cancelled) setCheckingSession(false); }
    }
    init();
    const fallback = setTimeout(() => { if (!cancelled) { setCheckingSession(false); setMessage((current) => current || "No active login found. Please login below."); } }, 3000);
    return () => { cancelled = true; clearTimeout(fallback); };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12 grid place-items-center">
      <div className="w-full max-w-md bg-white text-slate-950 rounded-2xl p-8 shadow-2xl">
        <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
        <h1 className="text-3xl font-black mt-4">Login</h1>
        <p className="text-gray-500 mt-2 mb-6">Use your Seattle Desi TV account.</p>

        {currentUser && !checkingSession ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-5 text-sm">
            <p>Currently logged in as <b>{currentUser.email}</b>.</p>
            <div className="grid gap-3 mt-4">
              <button type="button" onClick={() => redirectForUser(currentUser)} disabled={loading} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60">{loading ? "Redirecting..." : "Continue"}</button>
              <a href="/studio" className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-center">Go to Studio</a>
              <div className="border rounded-xl p-3 bg-white">
                <label className="block text-xs font-bold text-gray-500 mb-2">Request account type</label>
                <select className="w-full border rounded-lg p-3 mb-3" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)}>
                  <option value="general_public">General Public</option>
                  <option value="team_member">SDTV Team Member</option>
                </select>
                <button type="button" onClick={requestRole} className="w-full border border-pink-600 text-pink-600 py-3 rounded-xl font-black">Submit Role Request</button>
                {roleRequestMessage && <p className="text-xs text-orange-600 mt-2">{roleRequestMessage}</p>}
              </div>
              <button type="button" onClick={cleanLogout} disabled={loading} className="w-full border border-red-500 text-red-600 py-3 rounded-xl font-black disabled:opacity-60">Logout / Clear Session</button>
            </div>
          </div>
        ) : (
          <>
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={signIn} disabled={loading || checkingSession} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60">{checkingSession ? "Checking login..." : loading ? "Logging in..." : "Login"}</button>
          </>
        )}

        {message && <p className="text-sm text-orange-600 mt-4 whitespace-pre-line">{message}</p>}
      </div>
    </main>
  );
}

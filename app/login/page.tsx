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

function statusLabel(status?: string | null) {
  if (status === "awaiting_orientation") return "Awaiting Orientation";
  if (status === "awaiting_onboarding") return "Complete Your Onboarding";
  if (status === "awaiting_team_role_access") return "Onboarding Submitted";
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending Approval";
  return "Not Started";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking login...");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [role, setRole] = useState("general_public");
  const [volunteerStatus, setVolunteerStatus] = useState("");
  const [teamAccessStatus, setTeamAccessStatus] = useState("");
  const [roleRequestMessage, setRoleRequestMessage] = useState("");

  async function loadAccessState(user: any) {
    if (!user?.email) return;
    const nextRole = await resolveUserRole(supabase, user);
    setRole(nextRole);
    const { data } = await supabase
      .from("user_role_requests")
      .select("requested_role,status,created_at")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .order("created_at", { ascending: false })
      .limit(20);
    const rows = data || [];
    const volunteer = rows.find((row: any) => row.requested_role === "volunteer");
    const team = rows.find((row: any) => row.requested_role === "team_member");
    setVolunteerStatus(volunteer?.status || "");
    setTeamAccessStatus(team?.status || "");
  }

  async function redirectForUser(user: any) {
    setLoading(true);
    setMessage("Redirecting...");
    const nextRole = await resolveUserRole(supabase, user);
    window.location.assign(isAdminRole(nextRole) ? "/studio" : "/my-hub");
  }

  async function signIn() {
    setMessage("");
    if (!email || !password) { setMessage("Please enter email and password."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setMessage(error.message); return; }
    if (data.user) { setCurrentUser(data.user); await loadAccessState(data.user); setMessage("Login successful. Redirecting..."); await redirectForUser(data.user); }
    else { setLoading(false); setMessage("Login completed but no user session was returned."); }
  }

  async function signUp() {
    setMessage("");
    if (!email || !password) { setMessage("Please enter email and password to create an account."); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/login` } });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    if (data.user && data.session) {
      setCurrentUser(data.user);
      await loadAccessState(data.user);
      setMessage("Account created and logged in.");
      return;
    }
    setMessage("Account created. Please check your email to confirm your account before logging in.");
  }

  async function sendMagicLink() {
    setMessage("");
    if (!email) { setMessage("Please enter your email to receive a magic link."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/login` } });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Magic link sent. Please check your email.");
  }

  async function resetPassword() {
    setMessage("");
    if (!email) { setMessage("Please enter your email to reset your password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setLoading(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Password reset email sent. Please check your inbox.");
  }

  async function requestVolunteer() {
    setRoleRequestMessage("");
    if (!currentUser?.email) { setRoleRequestMessage("Please login first."); return; }
    const { error } = await supabase.from("user_role_requests").insert({
      user_id: currentUser.id,
      email: currentUser.email,
      requested_role: "volunteer",
      status: "awaiting_orientation",
      approved_role: null,
    });
    if (error) { setRoleRequestMessage(`Volunteer request failed: ${error.message}`); return; }
    setVolunteerStatus("awaiting_orientation");
    setRoleRequestMessage("Volunteer request submitted. SDTV team will contact you for orientation.");
  }

  async function requestTeamAccess() {
    setRoleRequestMessage("");
    if (!currentUser?.email) { setRoleRequestMessage("Please login first."); return; }
    const { error } = await supabase.from("user_role_requests").insert({
      user_id: currentUser.id,
      email: currentUser.email,
      requested_role: "team_member",
      status: "pending",
      approved_role: null,
    });
    if (error) { setRoleRequestMessage(`Team access request failed: ${error.message}`); return; }
    setTeamAccessStatus("pending");
    setRoleRequestMessage("Team access request submitted for admin approval.");
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
        if (user) { setEmail(user.email || ""); await loadAccessState(user); setMessage(`Already logged in as ${user.email}.`); }
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

  const activeTeam = role !== "general_public" && role !== "";
  const showVolunteerButton = !activeTeam && !volunteerStatus;
  const showOnboardingLink = volunteerStatus === "awaiting_onboarding";
  const showTeamAccessButton = !activeTeam && teamAccessStatus !== "pending" && teamAccessStatus !== "approved";

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12 grid place-items-center">
      <div className="w-full max-w-md bg-white text-slate-950 rounded-2xl p-8 shadow-2xl">
        <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
        <h1 className="text-3xl font-black mt-4">Account</h1>
        <p className="text-gray-500 mt-2 mb-6">Use your Seattle Desi TV account.</p>

        {currentUser && !checkingSession ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-5 text-sm">
            <p>Currently logged in as <b>{currentUser.email}</b>.</p>
            <p className="mt-2">Current Role: <b>{activeTeam ? role.replaceAll("_", " ") : "General Public"}</b></p>
            <div className="grid gap-3 mt-4">
              <button type="button" onClick={() => redirectForUser(currentUser)} disabled={loading} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60">{loading ? "Redirecting..." : "Go to My Hub"}</button>
              {isAdminRole(role) && <a href="/studio" className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-center">Go to Studio</a>}

              {!activeTeam && <div className="border rounded-xl p-3 bg-white text-slate-950">
                <h2 className="font-black text-lg">Volunteer & Team Access</h2>
                {volunteerStatus && <div className="bg-pink-50 rounded-xl p-3 mt-3"><p className="text-xs font-black uppercase text-pink-600">Volunteer Status</p><p className="font-black mt-1">{statusLabel(volunteerStatus)}</p>{volunteerStatus === "awaiting_orientation" && <p className="text-sm text-gray-600 mt-1">Thank you for your interest. SDTV team will contact you for orientation.</p>}{volunteerStatus === "awaiting_team_role_access" && <p className="text-sm text-gray-600 mt-1">Your onboarding has been submitted and is awaiting team role access approval.</p>}</div>}
                {teamAccessStatus && <div className="bg-slate-50 rounded-xl p-3 mt-3"><p className="text-xs font-black uppercase text-slate-600">Team Access Status</p><p className="font-black mt-1">{statusLabel(teamAccessStatus)}</p></div>}
                {showVolunteerButton && <button type="button" onClick={requestVolunteer} className="w-full border border-pink-600 text-pink-600 py-3 rounded-xl font-black mt-3">Request to Volunteer</button>}
                {showOnboardingLink && <a href="/onboarding" className="block w-full bg-pink-600 text-white py-3 rounded-xl font-black text-center mt-3">Complete Onboarding</a>}
                {showTeamAccessButton && <button type="button" onClick={requestTeamAccess} className="w-full border border-slate-900 text-slate-900 py-3 rounded-xl font-black mt-3">Already Joined? Request Team Access</button>}
                {roleRequestMessage && <p className="text-xs text-orange-600 mt-2">{roleRequestMessage}</p>}
              </div>}

              {activeTeam && <div className="border rounded-xl p-3 bg-white text-slate-950"><p className="font-black text-green-700">✓ Active SDTV Team Member</p></div>}
              <button type="button" onClick={cleanLogout} disabled={loading} className="w-full border border-red-500 text-red-600 py-3 rounded-xl font-black disabled:opacity-60">Logout / Clear Session</button>
            </div>
          </div>
        ) : (
          <>
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" onClick={signIn} disabled={loading || checkingSession} className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60">{checkingSession ? "Checking login..." : loading ? "Please wait..." : "Login"}</button>
            <div className="grid gap-2 mt-3">
              <button type="button" onClick={signUp} disabled={loading || checkingSession} className="w-full border border-pink-600 text-pink-600 py-3 rounded-xl font-black disabled:opacity-60">Sign Up</button>
              <button type="button" onClick={sendMagicLink} disabled={loading || checkingSession} className="w-full border border-slate-900 text-slate-900 py-3 rounded-xl font-black disabled:opacity-60">Send Magic Link</button>
              <button type="button" onClick={resetPassword} disabled={loading || checkingSession} className="w-full text-sm font-bold text-slate-600 underline disabled:opacity-60">Reset Password</button>
            </div>
          </>
        )}

        {message && <p className="text-sm text-orange-600 mt-4 whitespace-pre-line">{message}</p>}
      </div>
    </main>
  );
}

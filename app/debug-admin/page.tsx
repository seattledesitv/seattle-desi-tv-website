"use client";

import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function storageSnapshot() {
  try {
    return {
      authStorageKeyInUse: AUTH_STORAGE_KEY,
      localStorageKeys: Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY),
      sessionStorageKeys: Object.keys(sessionStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY),
    };
  } catch (error: any) {
    return { storageError: error?.message || String(error) };
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(promise)
      .then((value) => { clearTimeout(timer); resolve(value); })
      .catch((error) => { clearTimeout(timer); reject(error); });
  });
}

export default function DebugAdminPage() {
  const [result, setResult] = useState<any>({ loading: true, step: "starting" });

  async function runDebug() {
    setResult({ loading: true, step: "checking session", storage: storageSnapshot() });
    try {
      const sessionResponse = await withTimeout(supabase.auth.getSession(), 3000, "getSession");
      const sessionUser = sessionResponse.data?.session?.user || null;
      let userResponse: any = null;
      let userError: any = null;
      try {
        userResponse = await withTimeout(supabase.auth.getUser(), 3000, "getUser");
      } catch (error: any) {
        userError = { message: error?.message, name: error?.name };
      }
      const user = userResponse?.data?.user || sessionUser || null;
      if (!user) {
        setResult({ loading: false, storage: storageSnapshot(), sessionExists: Boolean(sessionResponse.data?.session), sessionError: sessionResponse.error || null, currentUser: null, currentUserError: userResponse?.error || userError, adminRow: null, adminLookupError: null, userRole: "", isAdmin: false, canAccessAdminArea: false, note: "No Supabase user is currently logged in." });
        return;
      }
      const adminLookup = await withTimeout(
        supabase.from("admins").select("user_id,email,role,name,created_at").or(`user_id.eq.${user.id},email.eq.${user.email}`).maybeSingle(),
        3000,
        "admin lookup",
      );
      const userRole = adminLookup.data?.role || "";
      setResult({ loading: false, storage: storageSnapshot(), sessionExists: Boolean(sessionResponse.data?.session), sessionError: sessionResponse.error || null, currentUser: { id: user.id, email: user.email, roleFromJwt: user.role, aud: user.aud }, currentUserError: userResponse?.error || userError, adminRow: adminLookup.data || null, adminLookupError: adminLookup.error || null, userRole, isAdmin: roleContainsAdmin(userRole), canAccessAdminArea: Boolean(user && roleContainsAdmin(userRole)), expectedForStudio: "currentUser exists AND userRole contains admin" });
    } catch (error: any) {
      setResult({ loading: false, storage: storageSnapshot(), caughtError: { message: error?.message, name: error?.name, stack: error?.stack } });
    }
  }

  async function logout() {
    setResult({ loading: true, step: "logging out", storage: storageSnapshot() });
    try { await withTimeout(supabase.auth.signOut({ scope: "global" }), 3000, "signOut"); } catch {}
    try {
      Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-") || key === AUTH_STORAGE_KEY).forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    await runDebug();
  }

  useEffect(() => { runDebug(); }, []);

  return <main className="min-h-screen bg-slate-950 p-8 text-white"><div className="mx-auto max-w-5xl space-y-6"><div><a href="/" className="font-bold text-pink-300">← Back to Home</a><h1 className="mt-3 text-3xl font-black">Admin Role Debug</h1><p className="mt-2 text-slate-300">This page checks Supabase session, storage keys, and the admins table lookup.</p></div><div className="flex flex-wrap gap-3"><button onClick={runDebug} className="rounded-xl bg-pink-600 px-5 py-3 font-bold">Run Debug Again</button><a href="/login" className="rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Go to Login</a><button onClick={logout} className="rounded-xl border border-red-400 px-5 py-3 font-bold text-red-300">Logout / Clear Session</button></div><div className="overflow-auto rounded-2xl border border-white/10 bg-black p-5"><h2 className="mb-3 font-black">Debug Result</h2><pre className="whitespace-pre-wrap text-sm">{JSON.stringify(result, null, 2)}</pre></div></div></main>;
}

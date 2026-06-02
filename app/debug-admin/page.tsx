"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

function roleContainsAdmin(role: string) {
  return String(role || "").toLowerCase().trim().includes("admin");
}

function storageSnapshot() {
  try {
    return {
      localStorageKeys: Object.keys(localStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-")),
      sessionStorageKeys: Object.keys(sessionStorage).filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-")),
    };
  } catch (error: any) {
    return { storageError: error?.message || String(error) };
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
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
        userError = {
          message: error?.message,
          name: error?.name,
        };
      }

      const user = userResponse?.data?.user || sessionUser || null;

      if (!user) {
        setResult({
          loading: false,
          storage: storageSnapshot(),
          sessionExists: Boolean(sessionResponse.data?.session),
          sessionError: sessionResponse.error ? JSON.parse(JSON.stringify(sessionResponse.error)) : null,
          currentUser: null,
          currentUserError: userResponse?.error ? JSON.parse(JSON.stringify(userResponse.error)) : userError,
          adminRow: null,
          adminLookupError: null,
          userRole: "",
          isAdmin: false,
          canAccessAdminArea: false,
          note: "No Supabase user is currently logged in, or session retrieval failed."
        });
        return;
      }

      const adminLookup = await withTimeout(
        supabase
          .from("admins")
          .select("user_id,email,role,name,created_at")
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .maybeSingle(),
        3000,
        "admin lookup"
      );

      const userRole = adminLookup.data?.role || "";
      const isAdmin = roleContainsAdmin(userRole);
      const canAccessAdminArea = Boolean(user && isAdmin);

      setResult({
        loading: false,
        storage: storageSnapshot(),
        sessionExists: Boolean(sessionResponse.data?.session),
        sessionError: sessionResponse.error ? JSON.parse(JSON.stringify(sessionResponse.error)) : null,
        currentUser: {
          id: user.id,
          email: user.email,
          roleFromJwt: user.role,
          aud: user.aud
        },
        currentUserError: userResponse?.error ? JSON.parse(JSON.stringify(userResponse.error)) : userError,
        adminRow: adminLookup.data || null,
        adminLookupError: adminLookup.error ? JSON.parse(JSON.stringify(adminLookup.error)) : null,
        userRole,
        isAdmin,
        canAccessAdminArea,
        expectedForStudio: "currentUser exists AND userRole contains admin"
      });
    } catch (error: any) {
      setResult({
        loading: false,
        storage: storageSnapshot(),
        caughtError: {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        }
      });
    }
  }

  async function logout() {
    setResult({ loading: true, step: "logging out", storage: storageSnapshot() });
    try {
      await withTimeout(supabase.auth.signOut({ scope: "global" }), 3000, "signOut");
    } catch {}
    try {
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-"))
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-"))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    await runDebug();
  }

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <a href="/" className="text-pink-300 font-bold">← Back to Home</a>
          <h1 className="text-3xl font-black mt-3">Admin Role Debug</h1>
          <p className="text-slate-300 mt-2">This page checks Supabase session, storage keys, and the admins table lookup.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={runDebug} className="bg-pink-600 px-5 py-3 rounded-xl font-bold">Run Debug Again</button>
          <a href="/login" className="bg-white text-slate-950 px-5 py-3 rounded-xl font-bold">Go to Login</a>
          <button onClick={logout} className="border border-red-400 text-red-300 px-5 py-3 rounded-xl font-bold">Logout / Clear Session</button>
        </div>

        <div className="bg-black rounded-2xl p-5 overflow-auto border border-white/10">
          <h2 className="font-black mb-3">Debug Result</h2>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}

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

export default function DebugAdminPage() {
  const [result, setResult] = useState<any>({ loading: true, step: "starting" });

  async function runDebug() {
    setResult({ loading: true, step: "checking current user" });

    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user || null;

      if (!user) {
        setResult({
          loading: false,
          currentUser: null,
          currentUserError: userResponse.error ? JSON.parse(JSON.stringify(userResponse.error)) : null,
          adminRow: null,
          adminLookupError: null,
          userRole: "",
          isAdmin: false,
          canAccessAdminArea: false,
          note: "No Supabase user is currently logged in."
        });
        return;
      }

      const adminLookup = await supabase
        .from("admins")
        .select("user_id,email,role,name,created_at")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      const userRole = adminLookup.data?.role || "";
      const isAdmin = roleContainsAdmin(userRole);
      const canAccessAdminArea = Boolean(user && isAdmin);

      setResult({
        loading: false,
        currentUser: {
          id: user.id,
          email: user.email,
          roleFromJwt: user.role,
          aud: user.aud
        },
        currentUserError: userResponse.error ? JSON.parse(JSON.stringify(userResponse.error)) : null,
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
        caughtError: {
          message: error?.message,
          name: error?.name,
          stack: error?.stack
        }
      });
    }
  }

  async function logout() {
    await supabase.auth.signOut({ scope: "global" });
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
          <p className="text-slate-300 mt-2">This page checks only Supabase user session and the admins table lookup.</p>
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

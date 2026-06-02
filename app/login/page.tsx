"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

function isAdminRole(role: string) {
  return String(role || "").toLowerCase().includes("admin");
}

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Session check timed out.")), ms);
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking login...");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  async function getRoleForUser(user: any) {
    if (!user?.id && !user?.email) return "";

    const { data, error } = await supabase
      .from("admins")
      .select("role")
      .or(`user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (error) {
      console.error("Admin role lookup failed", error);
      return "";
    }

    return data?.role || "";
  }

  async function redirectForUser(user: any) {
    const role = await getRoleForUser(user);
    if (isAdminRole(role)) {
      window.location.href = "/#studio";
    } else {
      window.location.href = "/";
    }
  }

  async function signIn() {
    setMessage("");

    if (!email || !password) {
      setMessage("Please enter email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.user) {
      setCurrentUser(data.user);
      setMessage("Login successful. Redirecting...");
      await redirectForUser(data.user);
    } else {
      setLoading(false);
      setMessage("Login completed but no user session was returned.");
    }
  }

  async function cleanLogout() {
    setLoading(true);
    setMessage("Logging out...");
    await supabase.auth.signOut({ scope: "global" });
    try {
      localStorage.removeItem("supabase.auth.token");
      Object.keys(localStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-"))
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.toLowerCase().includes("supabase") || key.toLowerCase().includes("sb-"))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // ignore browser storage cleanup errors
    }
    setCurrentUser(null);
    setPassword("");
    setLoading(false);
    setCheckingSession(false);
    setMessage("Logged out. You can login again now.");
    window.history.replaceState({}, "", "/login");
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data } = await withTimeout(supabase.auth.getUser(), 2500);
        if (cancelled) return;

        const user = data?.user || null;
        setCurrentUser(user);

        if (user) {
          setEmail(user.email || "");
          setMessage(`Already logged in as ${user.email}. Use Continue or Logout below.`);
        } else {
          setMessage("");
        }
      } catch (error: any) {
        if (cancelled) return;
        console.warn("Login session check failed or timed out", error);
        setCurrentUser(null);
        setMessage("Session check timed out. You can login again below.");
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    init();

    const fallback = setTimeout(() => {
      if (!cancelled) {
        setCheckingSession(false);
        setMessage((current) => current || "Session check timed out. You can login again below.");
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
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
              <button
                type="button"
                onClick={() => redirectForUser(currentUser)}
                disabled={loading}
                className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={cleanLogout}
                disabled={loading}
                className="w-full border border-red-500 text-red-600 py-3 rounded-xl font-black disabled:opacity-60"
              >
                Logout / Clear Session
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              className="w-full border rounded-lg p-3 mb-3"
              placeholder="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <input
              className="w-full border rounded-lg p-3 mb-3"
              placeholder="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              type="button"
              onClick={signIn}
              disabled={loading || checkingSession}
              className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60"
            >
              {checkingSession ? "Checking login..." : loading ? "Logging in..." : "Login"}
            </button>
          </>
        )}

        {message && <p className="text-sm text-orange-600 mt-4 whitespace-pre-line">{message}</p>}
      </div>
    </main>
  );
}

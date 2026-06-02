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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Checking login...");
  const [loading, setLoading] = useState(false);

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
      setMessage("Login successful. Redirecting...");
      await redirectForUser(data.user);
    } else {
      setLoading(false);
      setMessage("Login completed but no user session was returned.");
    }
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setMessage(`Already logged in as ${data.user.email}. Redirecting...`);
        await redirectForUser(data.user);
      } else {
        setMessage("");
      }
    }

    init();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12 grid place-items-center">
      <div className="w-full max-w-md bg-white text-slate-950 rounded-2xl p-8 shadow-2xl">
        <a href="/" className="text-sm font-bold text-pink-600">← Back to Seattle Desi TV</a>
        <h1 className="text-3xl font-black mt-4">Login</h1>
        <p className="text-gray-500 mt-2 mb-6">Use your Seattle Desi TV account.</p>

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

        {message && <p className="text-sm text-orange-600 mb-3 whitespace-pre-line">{message}</p>}

        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="w-full bg-pink-600 text-white py-3 rounded-xl font-black disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </main>
  );
}

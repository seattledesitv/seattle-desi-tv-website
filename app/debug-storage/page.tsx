"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "event-posters";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export default function DebugStoragePage() {
  const [user, setUser] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>({ loading: true });

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getUser();
      setUser(data?.user || null);
      setResult({
        loading: false,
        currentUser: data?.user ? { id: data.user.id, email: data.user.email } : null,
        currentUserError: error ? JSON.parse(JSON.stringify(error)) : null,
        supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      });
    }

    init();
  }, []);

  async function testUpload() {
    if (!file) {
      setResult({ error: "Choose a file first." });
      return;
    }

    const userId = user?.id || "anonymous";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${userId}/${Date.now()}-${safeName}`;

    setResult({
      loading: true,
      step: "uploading",
      bucket: BUCKET,
      path,
      file: {
        name: file.name,
        type: file.type,
        size: file.size,
      },
      user: user ? { id: user.id, email: user.email } : null,
    });

    try {
      const uploadResponse = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

      const publicUrlResponse = supabase.storage.from(BUCKET).getPublicUrl(path);

      setResult({
        loading: false,
        bucket: BUCKET,
        path,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        user: user ? { id: user.id, email: user.email } : null,
        uploadData: uploadResponse.data,
        uploadError: uploadResponse.error ? JSON.parse(JSON.stringify(uploadResponse.error)) : null,
        publicUrlData: publicUrlResponse.data,
      });
    } catch (error: any) {
      setResult({
        loading: false,
        bucket: BUCKET,
        path,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        user: user ? { id: user.id, email: user.email } : null,
        caughtError: {
          message: error?.message,
          name: error?.name,
          stack: error?.stack,
          raw: JSON.parse(JSON.stringify(error || {})),
        },
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <a href="/events" className="text-pink-300 font-bold">← Back to Events</a>
          <h1 className="text-3xl font-black mt-3">Storage Upload Debug</h1>
          <p className="text-slate-300 mt-2">Tests direct upload to the event-posters Supabase Storage bucket.</p>
        </div>

        <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
          <p className="text-sm text-slate-300 mb-3">
            Logged in as: <b>{user?.email || "Not logged in"}</b>
          </p>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full bg-white text-black rounded-lg p-3 mb-4"
          />
          <button
            type="button"
            onClick={testUpload}
            className="bg-pink-600 text-white px-5 py-3 rounded-xl font-bold"
          >
            Test Upload
          </button>
        </div>

        <div className="bg-black rounded-2xl p-5 overflow-auto border border-white/10">
          <h2 className="font-black mb-3">Debug Result</h2>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}

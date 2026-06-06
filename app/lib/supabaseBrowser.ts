"use client";

import { createClient } from "@supabase/supabase-js";

export const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

type BrowserSupabaseClient = ReturnType<typeof createClient<any, any, any>>;

let browserClient: BrowserSupabaseClient | null = null;

export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  if (browserClient) return browserClient;

  browserClient = createClient<any, any, any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  return browserClient;
}

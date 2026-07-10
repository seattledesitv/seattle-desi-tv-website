"use client";

import { createClient } from "@supabase/supabase-js";

export const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

type BrowserSupabaseClient = ReturnType<typeof createClient<any, any, any>>;

let browserClient: BrowserSupabaseClient | null = null;
let serverPrerenderClient: BrowserSupabaseClient | null = null;

const SERVER_PLACEHOLDER_URL = "https://prerender-placeholder.supabase.co";
const SERVER_PLACEHOLDER_KEY = "prerender-placeholder-anon-key";

/**
 * Returns the shared Supabase client used by client components.
 *
 * Next.js may evaluate client-component modules while prerendering on the
 * server. Many existing components request this client at module scope. In
 * that environment browser-only public variables may be unavailable, so we
 * return a non-persistent placeholder client that is never used for browser
 * data access. The browser bundle creates the real client separately.
 */
export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  const isBrowser = typeof window !== "undefined";

  if (!isBrowser) {
    if (!serverPrerenderClient) {
      serverPrerenderClient = createClient<any, any, any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || SERVER_PLACEHOLDER_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVER_PLACEHOLDER_KEY,
        {
          auth: {
            storageKey: AUTH_STORAGE_KEY,
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        }
      );
    }
    return serverPrerenderClient;
  }

  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase browser configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
    );
  }

  browserClient = createClient<any, any, any>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

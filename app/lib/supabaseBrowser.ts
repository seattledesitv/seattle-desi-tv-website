"use client";

import { createClient } from "@supabase/supabase-js";

export const AUTH_STORAGE_KEY = "sdtv-auth-token-v2";

type BrowserSupabaseClient = ReturnType<typeof createClient<any, any, any>>;

let browserClient: BrowserSupabaseClient | null = null;
let serverPrerenderClient: BrowserSupabaseClient | null = null;

const PLACEHOLDER_URL = "https://prerender-placeholder.supabase.co";
const PLACEHOLDER_KEY = "prerender-placeholder-anon-key";

/**
 * Returns the shared Supabase client used by client components.
 *
 * Next.js may evaluate client-component modules during prerendering. When the
 * public Supabase variables are unavailable, use a non-persistent placeholder
 * client instead of throwing at module evaluation. This keeps the public site
 * and error boundaries renderable while Vercel configuration is corrected.
 */
export function getSupabaseBrowserClient(): BrowserSupabaseClient {
  const isBrowser = typeof window !== "undefined";

  if (!isBrowser) {
    if (!serverPrerenderClient) {
      serverPrerenderClient = createClient<any, any, any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
        {
          auth: {
            storageKey: AUTH_STORAGE_KEY,
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      );
    }
    return serverPrerenderClient;
  }

  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasConfiguration = Boolean(supabaseUrl && supabaseAnonKey);

  if (!hasConfiguration) {
    console.error(
      "Supabase browser configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY for the Vercel Production environment, then redeploy.",
    );
  }

  browserClient = createClient<any, any, any>(
    supabaseUrl || PLACEHOLDER_URL,
    supabaseAnonKey || PLACEHOLDER_KEY,
    {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: hasConfiguration,
        autoRefreshToken: hasConfiguration,
        detectSessionInUrl: hasConfiguration,
      },
    },
  );

  return browserClient;
}

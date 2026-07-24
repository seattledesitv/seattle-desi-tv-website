import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function absoluteUrl(value: string, base: URL) {
  try { return new URL(value, base).toString(); } catch { return ""; }
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1") return false;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
    return true;
  } catch { return false; }
}

function collectMatches(html: string, page: URL) {
  const found = new Map<string, { url: string; source: string }>();
  const add = (raw: string, source: string) => {
    const url = absoluteUrl(raw.replace(/&amp;/g, "&"), page);
    if (!url || !isPublicHttpUrl(url)) return;
    if (!/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url) && !source.includes("meta")) return;
    if (!found.has(url)) found.set(url, { url, source });
  };
  const metaPatterns = [
    [/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi, "official website meta image"],
    [/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi, "official website meta image"],
    [/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi, "official website social image"],
  ] as const;
  for (const [pattern, source] of metaPatterns) for (const match of html.matchAll(pattern)) add(match[1], source);
  for (const match of html.matchAll(/<link[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/gi)) add(match[1], "official website icon");
  for (const match of html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0].toLowerCase();
    if (/(logo|brand|header|hero)/.test(tag)) add(match[1], tag.includes("logo") ? "official website logo" : "official website featured image");
  }
  return Array.from(found.values()).slice(0, 12);
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const user = (await sessionClient.auth.getUser()).data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(sessionClient as any, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });

    const body = await request.json();
    const website = String(body.website || "").trim();
    if (!website || !isPublicHttpUrl(website)) return NextResponse.json({ error: "A valid public official website is required." }, { status: 400 });
    const page = new URL(website);
    const response = await fetch(page, { redirect: "follow", signal: AbortSignal.timeout(12000), headers: { "user-agent": "SeattleDesiTVBusinessDirectory/1.0" } });
    if (!response.ok) return NextResponse.json({ error: `Official website returned ${response.status}.` }, { status: 502 });
    const finalUrl = new URL(response.url);
    if (!isPublicHttpUrl(finalUrl.toString())) return NextResponse.json({ error: "Website redirected to an unsupported address." }, { status: 400 });
    const html = (await response.text()).slice(0, 1_500_000);
    return NextResponse.json({ ok: true, website: finalUrl.toString(), candidates: collectMatches(html, finalUrl) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.name === "TimeoutError" ? "Official website timed out." : error?.message || "Could not discover image candidates." }, { status: 500 });
  }
}

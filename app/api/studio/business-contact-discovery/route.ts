import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host)) return false;
    if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
    return true;
  } catch { return false; }
}

function cleanText(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ");
}

function unique<T>(items: T[]) { return Array.from(new Set(items)); }

function extractEmails(html: string) {
  const mailtos = Array.from(html.matchAll(/mailto:([^?"'\s>]+)/gi)).map((m) => decodeURIComponent(m[1]));
  const plain = cleanText(html).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return unique([...mailtos, ...plain]
    .map((v) => v.trim().toLowerCase())
    .filter((v) => !/(example\.com|sentry|wixpress|cloudflare|wordpress|noreply|no-reply)/i.test(v)));
}

function extractPhones(html: string) {
  const tels = Array.from(html.matchAll(/tel:([^"'\s>]+)/gi)).map((m) => decodeURIComponent(m[1]));
  const text = cleanText(html);
  const plain = text.match(/(?:\+?1[\s().-]*)?(?:\d{3}[\s().-]*){2}\d{4}/g) || [];
  return unique([...tels, ...plain].map((v) => v.trim()).filter((v) => v.replace(/\D/g, "").length >= 10));
}

function contactLinks(html: string, page: URL) {
  const links: string[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const label = cleanText(match[2]).toLowerCase();
    if (!/(contact|about|location|visit|connect|reach)/.test(`${href} ${label}`)) continue;
    try {
      const url = new URL(href, page);
      if (url.origin === page.origin && isPublicHttpUrl(url.toString())) links.push(url.toString());
    } catch {}
  }
  return unique(links).slice(0, 4);
}

function candidateWebsiteFromSource(sourceUrl: string, name: string) {
  if (!isPublicHttpUrl(sourceUrl)) return "";
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if (/(facebook|instagram|linkedin|youtube|yelp|google|bing|mapquest|yellowpages|eventbrite|seattledesitv)/.test(host)) return "";
    const tokens = name.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((t) => t.length > 3);
    if (!tokens.length || tokens.some((t) => host.includes(t))) return `${url.origin}/`;
  } catch {}
  return "";
}

async function fetchPage(url: string) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "SeattleDesiTVBusinessDirectory/1.0" } });
  if (!response.ok) throw new Error(`Website returned ${response.status}.`);
  const finalUrl = new URL(response.url);
  if (!isPublicHttpUrl(finalUrl.toString())) throw new Error("Website redirected to an unsupported address.");
  return { html: (await response.text()).slice(0, 1_500_000), url: finalUrl };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const user = (await client.auth.getUser()).data?.user || null;
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(client as any, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });

    const body = await request.json();
    const mode = String(body.mode || "");
    const name = String(body.name || "").trim();
    const website = String(body.website || "").trim();
    const sourceUrl = String(body.sourceUrl || "").trim();

    if (mode === "website") {
      const candidate = candidateWebsiteFromSource(sourceUrl, name);
      return NextResponse.json({ ok: true, mode, found: Boolean(candidate), value: candidate || null });
    }

    if (!["email", "phone"].includes(mode)) return NextResponse.json({ error: "Unsupported discovery mode." }, { status: 400 });
    if (!website || !isPublicHttpUrl(website)) return NextResponse.json({ ok: true, mode, found: false, value: null, reason: "Save an official website first." });

    const first = await fetchPage(website);
    const pages = [first];
    for (const link of contactLinks(first.html, first.url)) {
      try { pages.push(await fetchPage(link)); } catch {}
    }

    const emails = unique(pages.flatMap((p) => extractEmails(p.html)));
    const phones = unique(pages.flatMap((p) => extractPhones(p.html)));
    const values = mode === "email" ? emails : phones;
    return NextResponse.json({ ok: true, mode, found: values.length > 0, value: values[0] || null, candidates: values.slice(0, 5), checkedPages: pages.map((p) => p.url.toString()) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.name === "TimeoutError" ? "The website timed out." : error?.message || "Could not discover business contact information." }, { status: 500 });
  }
}

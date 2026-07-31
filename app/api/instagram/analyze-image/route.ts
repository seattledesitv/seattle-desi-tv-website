import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

function stripFence(v: string) {
  return String(v || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
function parseJson(v: string) {
  const s = stripFence(v);
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}
function extractJsonString(raw: string, key: string) {
  const s = String(raw || "");
  const marker = `"${key}"`;
  const start = s.indexOf(marker);
  if (start < 0) return "";
  let i = s.indexOf(":", start) + 1;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] !== '"') return "";
  i++;
  let out = "";
  let escaped = false;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (escaped) {
      out += ch === "n" ? "\n" : ch === "t" ? "\t" : ch;
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === '"') {
      break;
    } else {
      out += ch;
    }
  }
  return out.trim();
}
function arr(v: any) { return Array.isArray(v) ? v : v ? [String(v)] : []; }
function buildCaption(p: any, handles: string[]) {
  const d = p?.eventDetails || p?.event || {};
  const orgs = arr(p?.detectedOrganizations || p?.organizations).filter((x: string) => !/seattle desi tv/i.test(String(x)));
  const title = d.title || d.eventTitle || d.eventName || p?.title || "Community Event";
  const date = d.date ? `📅 ${d.date}` : "";
  const time = d.time ? `⏰ ${d.time}` : "";
  const place = d.venue || d.location ? `📍 ${[d.venue, d.location].filter(Boolean).join(", ")}` : "";
  const status = d.status ? `🎥 ${d.status}` : "";
  return [
    `✨ ${title}`,
    "",
    `Seattle Desi TV is proud to support ${orgs.length ? orgs.join(", ") : "this community moment"}. Watch and celebrate the energy, talent, and unforgettable moments from this special event.`,
    "",
    date, time, place, status,
    handles.length ? `With: ${handles.join(" ")}` : "",
    "",
    "Follow @seattledesitv for more community stories, events, and local highlights."
  ].filter(Boolean).join("\n");
}
function hashtags(v: any) {
  const list = arr(v).filter(Boolean);
  return list.length ? list.map((x) => String(x).startsWith("#") ? String(x) : `#${String(x).replace(/^#+/, "")}`) : ["#SeattleDesiTV", "#SeattleEvents", "#DesiCommunity", "#PNWDesi"];
}
function normalize(raw: string, handles: string[]) {
  const parsed = parseJson(raw) || {};
  let caption = String(parsed.suggestedCaption || parsed.caption || "").trim();
  if (!caption) caption = extractJsonString(raw, "suggestedCaption") || extractJsonString(raw, "caption");
  if (!caption || caption.length < 80 || caption.startsWith("{") || caption.includes('"extractedText"') || /proud to be a\s*$/i.test(caption)) caption = buildCaption(parsed, handles);
  return {
    extractedText: parsed.extractedText || extractJsonString(raw, "extractedText") || "",
    detectedPeople: parsed.detectedPeople || [],
    detectedOrganizations: parsed.detectedOrganizations || [],
    eventDetails: parsed.eventDetails || {},
    sdtvLogoDetected: Boolean(parsed.sdtvLogoDetected || /"sdtvLogoDetected"\s*:\s*true/i.test(raw)),
    suggestedCaption: caption,
    suggestedHashtags: hashtags(parsed.suggestedHashtags),
    suggestedAltText: parsed.suggestedAltText || extractJsonString(raw, "suggestedAltText") || "Uploaded event flyer shared by Seattle Desi TV."
  };
}
async function imageToInline(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Could not read uploaded image. Status: ${r.status}.`);
  return { mime_type: (r.headers.get("content-type") || "image/jpeg").split(";")[0], data: Buffer.from(await r.arrayBuffer()).toString("base64") };
}
async function callGemini(prompt: string, imageUrl: string) {
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  const inlineData = await imageToInline(imageUrl);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ generationConfig: { temperature: 0.3, maxOutputTokens: 3000 }, contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: inlineData }] }] })
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.message || `Gemini request failed with status ${r.status}.`);
  return j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("\n") || "";
}
async function callOpenAI(prompt: string, imageUrl: string) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` }, cache: "no-store", body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini", temperature: 0.4, max_tokens: 1800, messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }] }) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.message || `OpenAI request failed with status ${r.status}.`);
  return j?.choices?.[0]?.message?.content || "";
}
export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    const authHeader = request.headers.get("authorization") || "";
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const role = await resolveUserRole(client, user);
    if (!isAdminRole(role)) return NextResponse.json({ error: `Studio admin access required. Resolved role: ${role}.` }, { status: 403 });
    if (!geminiKey && !openAiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured in Vercel." }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const imageUrl = String(body.imageUrl || "").trim();
    const postContext = String(body.postContext || "").trim();
    const handles = Array.isArray(body.collaborators) ? body.collaborators.map(String) : [];
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return NextResponse.json({ error: "A public HTTPS image URL is required for flyer analysis." }, { status: 400 });
    const prompt = `Analyze this flyer for Seattle Desi TV. Extract flyer text and create a ready-to-post Instagram caption. Return one JSON object only with keys extractedText, detectedPeople, detectedOrganizations, eventDetails, sdtvLogoDetected, suggestedCaption, suggestedHashtags, suggestedAltText. The suggestedCaption must be complete. Admin context: ${postContext || "none"}. Handles: ${handles.join(" ") || "none"}.`;
    const provider = geminiKey ? "gemini" : "openai";
    const raw = provider === "gemini" ? await callGemini(prompt, imageUrl) : await callOpenAI(prompt, imageUrl);
    return NextResponse.json({ ok: true, provider, ...normalize(raw, handles) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Image analysis failed." }, { status: 500 });
  }
}

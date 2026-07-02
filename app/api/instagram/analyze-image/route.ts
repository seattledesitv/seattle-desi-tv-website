import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

function stripCodeFence(value: string) { return value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(); }
function safeJsonParse(value: string) {
  const cleaned = stripCodeFence(value || "");
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}
function asArray(value: any) { return Array.isArray(value) ? value : value ? [String(value)] : []; }
function titleCase(value: string) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : value; }
function isWeakCaption(value: any) {
  const text = String(value || "").trim();
  return !text || text.length < 120 || /proud to be a\s*$/i.test(text) || /caption:?\s*$/i.test(text);
}
function buildCaption(parsed: any, collaborators: string[]) {
  const details = parsed?.eventDetails || parsed?.event || {};
  const orgs = asArray(parsed?.detectedOrganizations || parsed?.organizations).filter(Boolean);
  const title = details.title || parsed?.title || "this community event";
  const date = details.date ? `📅 ${details.date}` : "";
  const time = details.time ? `⏰ ${details.time}` : "";
  const venue = details.venue || details.location ? `📍 ${[details.venue, details.location].filter(Boolean).join(", ")}` : "";
  const cost = details.cost || details.admission ? `🎟️ ${titleCase(String(details.cost || details.admission))}` : "";
  const website = details.website ? `Learn more: ${details.website}` : "";
  const withLine = collaborators.length ? `\n\nWith: ${collaborators.join(" ")}` : "";
  const orgLine = orgs.length ? `Seattle Desi TV is proud to support ${orgs.filter((x: string) => !/seattle desi tv/i.test(x)).join(", ") || "our community partners"}.` : "Seattle Desi TV is proud to support this community moment.";
  return [
    `✨ ${title}`,
    "",
    `${orgLine} Join us in encouraging young entrepreneurs as they launch their ideas, build brands, and share their creativity with the community.`,
    "",
    date,
    time,
    venue,
    cost,
    website,
    withLine.trim(),
    "",
    "Follow @seattledesitv for more community stories, events, and local highlights.",
  ].filter(Boolean).join("\n");
}
function normalizeAiJson(parsed: any, raw: string, provider: string, collaborators: string[]) {
  if (parsed && typeof parsed === "object") {
    const caption = isWeakCaption(parsed.suggestedCaption || parsed.caption) ? buildCaption(parsed, collaborators) : (parsed.suggestedCaption || parsed.caption || raw);
    return {
      extractedText: parsed.extractedText || parsed.text || parsed.flyerText || "",
      detectedPeople: parsed.detectedPeople || parsed.people || [],
      detectedOrganizations: parsed.detectedOrganizations || parsed.organizations || [],
      eventDetails: parsed.eventDetails || parsed.event || {},
      sdtvLogoDetected: Boolean(parsed.sdtvLogoDetected || parsed.seattleDesiTvLogoDetected),
      suggestedCaption: caption,
      suggestedHashtags: Array.isArray(parsed.suggestedHashtags) && parsed.suggestedHashtags.length ? parsed.suggestedHashtags : ["#SeattleDesiTV", "#SeattleEvents", "#DesiCommunity", "#PNWDesi", "#YouthEntrepreneurs"],
      suggestedAltText: parsed.suggestedAltText || parsed.altText || "Uploaded event flyer shared by Seattle Desi TV.",
      captionFallbackUsed: isWeakCaption(parsed.suggestedCaption || parsed.caption),
    };
  }
  return {
    extractedText: raw,
    detectedPeople: [],
    detectedOrganizations: [],
    eventDetails: {},
    sdtvLogoDetected: false,
    suggestedCaption: raw || "Seattle Desi TV is proud to share this community moment. Follow @seattledesitv for more local stories and event highlights.",
    suggestedHashtags: ["#SeattleDesiTV", "#SeattleEvents", "#DesiCommunity", "#PNWDesi"],
    suggestedAltText: "Uploaded event flyer shared by Seattle Desi TV.",
    parseFallback: true,
    provider,
  };
}
async function imageUrlToInlineData(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read uploaded image. Status: ${response.status}.`);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return { mime_type: contentType.split(";")[0] || "image/jpeg", data: base64 };
}
async function analyzeWithGemini(prompt: string, imageUrl: string) {
  const model = process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
  const inlineData = await imageUrlToInlineData(imageUrl);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature: 0.35, maxOutputTokens: 2200 },
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nReturn one valid JSON object only. No markdown. No explanation before or after JSON. The suggestedCaption must be a complete 120-220 word Instagram caption, not a fragment.` }, { inline_data: inlineData }] }],
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed with status ${response.status}.`);
  const raw = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || "").join("\n") || "";
  return { provider: "gemini", raw };
}
async function analyzeWithOpenAI(prompt: string, imageUrl: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({ model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini", temperature: 0.4, messages: [{ role: "system", content: "Return valid JSON only. Do not wrap it in markdown." }, { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] }], max_tokens: 1600 }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}.`);
  return { provider: "openai", raw: data?.choices?.[0]?.message?.content || "" };
}
export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    const authHeader = request.headers.get("authorization") || "";
    const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await sessionClient.auth.getUser();
    const user = userData?.user || null;
    if (userError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const resolvedRole = await resolveUserRole(sessionClient, user);
    if (!isAdminRole(resolvedRole)) return NextResponse.json({ error: `Studio admin access required. Resolved role: ${resolvedRole}.` }, { status: 403 });
    if (!geminiKey && !openAiKey) return NextResponse.json({ error: "GEMINI_API_KEY is not configured in Vercel. OPENAI_API_KEY can be used as a fallback." }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const imageUrl = String(body.imageUrl || "").trim();
    const postContext = String(body.postContext || "").trim();
    const collaborators = Array.isArray(body.collaborators) ? body.collaborators.map(String) : [];
    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return NextResponse.json({ error: "A public HTTPS image URL is required for flyer analysis." }, { status: 400 });
    const prompt = `You are the Seattle Desi TV social media assistant. Analyze this uploaded flyer/thumbnail using vision. Extract visible flyer text and context, then write a ready-to-use Instagram caption.\n\nRules:\n- Capture names, event title, organizations, venue, date/time, location, call-to-action, and whether Seattle Desi TV logo/media partner branding is already visible.\n- Keep the caption enthusiastic, clear, professional, and community-friendly.\n- Include collaborator handles supplied by the admin only as mentions; do not invent handles.\n- Return JSON only with keys: extractedText, detectedPeople, detectedOrganizations, eventDetails, sdtvLogoDetected, suggestedCaption, suggestedHashtags, suggestedAltText.\n\nAdmin context: ${postContext || "none"}\nAdmin collaborator handles: ${collaborators.join(" ") || "none"}`;
    const aiResult = geminiKey ? await analyzeWithGemini(prompt, imageUrl) : await analyzeWithOpenAI(prompt, imageUrl);
    const parsed = safeJsonParse(aiResult.raw);
    const normalized = normalizeAiJson(parsed, aiResult.raw, aiResult.provider, collaborators);
    return NextResponse.json({ ok: true, provider: aiResult.provider, raw: aiResult.raw, ...normalized });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Image analysis failed." }, { status: 500 });
  }
}

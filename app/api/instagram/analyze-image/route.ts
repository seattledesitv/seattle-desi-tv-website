import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

function safeJsonParse(value: string) {
  try { return JSON.parse(value); } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
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
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
        responseMimeType: "application/json",
      },
      contents: [{
        role: "user",
        parts: [
          { text: `${prompt}\n\nReturn valid JSON only. Do not wrap it in markdown.` },
          { inline_data: inlineData },
        ],
      }],
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
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: "Return valid JSON only. Do not wrap it in markdown." },
        { role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: imageUrl } }] },
      ],
      max_tokens: 1200,
    }),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed with status ${response.status}.`);
  const raw = data?.choices?.[0]?.message?.content || "";
  return { provider: "openai", raw };
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
    const collaborators = Array.isArray(body.collaborators) ? body.collaborators : [];

    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return NextResponse.json({ error: "A public HTTPS image URL is required for flyer analysis." }, { status: 400 });

    const prompt = `You are the Seattle Desi TV social media assistant. Analyze this uploaded flyer/thumbnail using vision. Extract visible flyer text and context, then write a ready-to-use Instagram caption.\n\nRules:\n- Capture names, event title, organizations, venue, date/time, location, call-to-action, and whether Seattle Desi TV logo/media partner branding is already visible.\n- If the event already happened, word the caption as recap/watch-now, not upcoming.\n- Keep the caption energetic, professional, and community-friendly.\n- Include collaborator handles supplied by the admin only as mentions; do not invent handles.\n- Return JSON only with keys: extractedText, detectedPeople, detectedOrganizations, eventDetails, sdtvLogoDetected, suggestedCaption, suggestedHashtags, suggestedAltText.\n\nAdmin context: ${postContext || "none"}\nAdmin collaborator handles: ${collaborators.join(" ") || "none"}`;

    const aiResult = geminiKey ? await analyzeWithGemini(prompt, imageUrl) : await analyzeWithOpenAI(prompt, imageUrl);
    const parsed = safeJsonParse(aiResult.raw);
    if (!parsed) return NextResponse.json({ error: "Could not parse AI response.", raw: aiResult.raw, provider: aiResult.provider }, { status: 500 });

    return NextResponse.json({ ok: true, provider: aiResult.provider, ...parsed });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Image analysis failed." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../../lib/roles";
import { resolveCurrentSite } from "../../../../lib/sites/siteResolver";

type GenerationTarget = "item" | "section" | "publication";
type RequestBody = {
  publicationId?: string;
  sectionId?: string | null;
  itemId?: string | null;
  targetType?: GenerationTarget;
  promptKey?: string;
  instruction?: string;
  context?: Record<string, unknown>;
  sourceAttribution?: Record<string, unknown>;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

function parseJson(raw: string): Record<string, unknown> {
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(clean) as Record<string, unknown>; } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI response was not valid JSON.");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

async function generate(systemPrompt: string, userPrompt: string) {
  if (geminiKey) {
    const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ generationConfig: { temperature: 0.4, responseMimeType: "application/json" }, contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }] }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error?.message || `Gemini request failed (${response.status}).`);
    const raw = json?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("\n") || "";
    return { provider: "gemini", model, content: parseJson(raw) };
  }
  if (openAiKey) {
    const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${openAiKey}` }, cache: "no-store",
      body: JSON.stringify({ model, temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) throw new Error(json?.error?.message || `OpenAI request failed (${response.status}).`);
    return { provider: "openai", model, content: parseJson(json?.choices?.[0]?.message?.content || "") };
  }
  throw new Error("Configure GEMINI_API_KEY or OPENAI_API_KEY before using AI generation.");
}

export async function POST(request: Request) {
  const site = await resolveCurrentSite();
  if (!site.id) return NextResponse.json({ error: "The current site is not configured." }, { status: 500 });
  if (!supabaseUrl || !anonKey) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  const authHeader = request.headers.get("authorization") || "";
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await client.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const role = await resolveUserRole(client, user);
  if (!isAdminRole(role)) return NextResponse.json({ error: "Studio admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({})) as RequestBody;
  const publicationId = String(body.publicationId || "").trim();
  const targetType = body.targetType;
  const promptKey = String(body.promptKey || `editorial_${targetType || ""}`).trim();
  if (!publicationId || !targetType || !["item", "section", "publication"].includes(targetType)) {
    return NextResponse.json({ error: "Publication ID and a valid target type are required." }, { status: 400 });
  }

  const { data: publication } = await client.from("publications").select("id").eq("id", publicationId).eq("site_id", site.id).maybeSingle();
  if (!publication) return NextResponse.json({ error: "Publication was not found for the current site." }, { status: 404 });

  const { data: prompt, error: promptError } = await client.from("publication_ai_prompts").select("prompt_key,system_prompt,user_prompt_template,version").eq("site_id", site.id).eq("prompt_key", promptKey).eq("active", true).single();
  if (promptError || !prompt) return NextResponse.json({ error: "Active AI prompt was not found. Apply the Sprint 5B migration." }, { status: 400 });

  const input = { instruction: body.instruction || "Improve this content.", context: body.context || {}, sourceAttribution: body.sourceAttribution || {} };
  try {
    const result = await generate(prompt.system_prompt, `${prompt.user_prompt_template}\nInstruction: ${input.instruction}\nContext JSON: ${JSON.stringify(input.context)}\nReturn only fields appropriate for ${targetType}.`);
    await client.from("publication_generation_history").insert({ publication_id: publicationId, publication_section_id: body.sectionId || null, publication_item_id: body.itemId || null, target_type: targetType, prompt_key: promptKey, provider: result.provider, model: result.model, status: "completed", source_attribution: input.sourceAttribution, input_snapshot: input, output_content: result.content, created_by: user.id });
    return NextResponse.json({ ok: true, ...result, promptVersion: prompt.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI generation failed.";
    await client.from("publication_generation_history").insert({ publication_id: publicationId, publication_section_id: body.sectionId || null, publication_item_id: body.itemId || null, target_type: targetType, prompt_key: promptKey, provider: geminiKey ? "gemini" : "openai", model: geminiKey ? (process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash") : (process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini"), status: "failed", source_attribution: input.sourceAttribution, input_snapshot: input, error_message: message, created_by: user.id });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

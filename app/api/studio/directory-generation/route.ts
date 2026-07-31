import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminRole, resolveUserRole } from "../../../lib/roles";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

type DirectoryKind = "businesses" | "organizations";
type Candidate = {
  name: string;
  category?: string;
  location?: string;
  address?: string;
  website?: string;
  description?: string;
  organization_type?: string;
};

function stripFence(value: string) {
  return String(value || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseCandidates(raw: string): Candidate[] {
  const cleaned = stripFence(raw);
  let parsed: any = null;
  try { parsed = JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) try { parsed = JSON.parse(match[0]); } catch {}
  }
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
  return rows
    .map((row: any) => ({
      name: String(row?.name || "").trim(),
      category: String(row?.category || "").trim(),
      location: String(row?.location || row?.city || "").trim(),
      address: String(row?.address || "").trim(),
      website: String(row?.website || "").trim(),
      description: String(row?.description || "").trim(),
      organization_type: String(row?.organization_type || row?.organizationType || "").trim(),
    }))
    .filter((row: Candidate) => row.name.length >= 2);
}

function normalizeWebsite(value?: string) {
  const v = String(value || "").trim();
  if (!v) return null;
  try { return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).toString(); } catch { return null; }
}

function promptFor(kind: DirectoryKind, count: number, location: string, categories: string[]) {
  const noun = kind === "businesses" ? "South Asian-owned or South Asian-serving local businesses" : "South Asian community, cultural, religious, youth, educational, professional, charitable, or sports organizations";
  return `Create a research candidate list of ${count} ${noun} in or near ${location}. Return ONLY a JSON array. Each item must contain: name, category, location, address, website, description${kind === "organizations" ? ", organization_type" : ""}. Use real entities only. Do not invent names, websites, addresses, or descriptions. If an official website is not confidently known, use an empty string. Keep descriptions factual and under 35 words. Prefer a diverse mix${categories.length ? ` across these categories: ${categories.join(", ")}` : ""}.`;
}

async function callGemini(prompt: string) {
  const model = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ generationConfig: { temperature: 0.15, maxOutputTokens: 7000, responseMimeType: "application/json" }, contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error?.message || "Gemini generation failed.");
  return String(json?.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

async function callOpenAI(prompt: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${openAiKey}` },
    cache: "no-store",
    body: JSON.stringify({ model: process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini", temperature: 0.1, messages: [{ role: "user", content: prompt }] }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.error?.message || "OpenAI generation failed.");
  return String(json?.choices?.[0]?.message?.content || "");
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
    const kind = String(body.kind || "") as DirectoryKind;
    const count = Math.min(50, Math.max(1, Number(body.count || 25)));
    const location = String(body.location || "Seattle metropolitan area, Washington").trim();
    const categories = Array.isArray(body.categories) ? body.categories.map((v: any) => String(v).trim()).filter(Boolean).slice(0, 12) : [];
    if (!(["businesses", "organizations"] as string[]).includes(kind)) return NextResponse.json({ error: "Choose businesses or organizations." }, { status: 400 });
    if (!geminiKey && !openAiKey) return NextResponse.json({ error: "Configure GEMINI_API_KEY or OPENAI_API_KEY before using batch generation." }, { status: 503 });

    const raw = geminiKey ? await callGemini(promptFor(kind, count, location, categories)) : await callOpenAI(promptFor(kind, count, location, categories));
    const generated = parseCandidates(raw).slice(0, count);
    if (!generated.length) return NextResponse.json({ error: "No usable candidates were generated." }, { status: 502 });

    const table = kind === "businesses" ? "local_businesses" : "community_organizations";
    const { data: existingRows, error: existingError } = await client.from(table).select("name").limit(5000);
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
    const existing = new Set((existingRows || []).map((row: any) => String(row.name || "").trim().toLowerCase()).filter(Boolean));
    const unique: Candidate[] = [];
    const seen = new Set<string>();
    for (const row of generated) {
      const key = row.name.toLowerCase();
      if (!key || existing.has(key) || seen.has(key)) continue;
      seen.add(key);
      unique.push(row);
    }

    const batchId = `ai-${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const payload = unique.map((row) => kind === "businesses" ? {
      name: row.name,
      category: row.category || "Other",
      address: row.address || row.location || location,
      website: normalizeWebsite(row.website),
      status: "pending",
      approved: false,
      source_name: "AI-assisted directory research",
      source_url: normalizeWebsite(row.website),
      import_batch: batchId,
      review_notes: row.description || "AI-generated research candidate. Verify all details before approval.",
    } : {
      name: row.name,
      category: row.category || "Community",
      location: row.location || location,
      website: normalizeWebsite(row.website),
      description: row.description || "AI-generated research candidate. Verify all details before approval.",
      organization_type: row.organization_type || "Community Organization",
      status: "pending",
      approved: false,
      submitted_email: user.email || "info@seattledesitv.com",
    });

    if (!payload.length) return NextResponse.json({ ok: true, generated: generated.length, inserted: 0, skippedDuplicates: generated.length, batchId, message: "All generated candidates already exist." });
    const { data: insertedRows, error: insertError } = await client.from(table).insert(payload).select("id,name");
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({ ok: true, generated: generated.length, inserted: insertedRows?.length || 0, skippedDuplicates: generated.length - unique.length, batchId, items: insertedRows || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not generate directory candidates." }, { status: 500 });
  }
}

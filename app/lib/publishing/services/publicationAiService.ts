import type { SupabaseClient } from "@supabase/supabase-js";

export type AiGenerationTarget = "item" | "section" | "publication";
export type AiGenerationRequest = {
  publicationId: string;
  sectionId?: string | null;
  itemId?: string | null;
  targetType: AiGenerationTarget;
  instruction: string;
  context: Record<string, unknown>;
  sourceAttribution?: Record<string, unknown>;
};

export type AiGenerationResult = {
  provider: string;
  model: string;
  promptVersion: number;
  content: Record<string, unknown>;
};

export async function generatePublicationContent(
  supabase: SupabaseClient,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Please log in before using AI generation.");
  const response = await fetch("/api/studio/publishing/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || "AI generation failed.");
  return result as AiGenerationResult;
}

export function editableAiFields(content: Record<string, unknown>) {
  const allowed = ["title", "description", "image_url", "destination_url", "introduction", "summary"];
  return Object.fromEntries(Object.entries(content).filter(([key, value]) => allowed.includes(key) && typeof value === "string"));
}

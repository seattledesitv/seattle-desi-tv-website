import type { SupabaseClient } from "@supabase/supabase-js";
import { listAiPrompts, updateAiPrompt, type PublicationAiPrompt } from "../repositories/publicationAiRepository";
export const getPublicationAiPrompts = (supabase: SupabaseClient, siteId: string) => listAiPrompts(supabase, siteId);
export async function savePublicationAiPrompt(supabase: SupabaseClient, prompt: PublicationAiPrompt, siteId: string) { if (!prompt.system_prompt.trim() || !prompt.user_prompt_template.trim()) throw new Error("Both prompt fields are required."); const session = await supabase.auth.getSession(); const user = session.data.session?.user; if (!user) throw new Error("Please log in to manage prompts."); return updateAiPrompt(supabase, prompt, user.id, siteId); }

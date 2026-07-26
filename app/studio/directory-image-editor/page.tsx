"use client";

import { useEffect, useState } from "react";
import StudioHeader from "../../components/StudioHeader";
import StudioDirectoryImageManager from "../../components/StudioDirectoryImageManager";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";

const supabase = getSupabaseBrowserClient();

export default function StudioDirectoryImageEditorPage() {
  const [record, setRecord] = useState<any>(null);
  const [message, setMessage] = useState("Checking access...");
  const [kind, setKind] = useState<"business" | "organization">("business");

  async function load() {
    const params = new URLSearchParams(window.location.search);
    const nextKind = params.get("type") === "organization" ? "organization" : "business";
    const id = params.get("id") || "";
    setKind(nextKind);
    if (!id) return setMessage("Choose a business or organization from Studio.");
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user || null;
    if (!user) return setMessage("Please login to access Studio.");
    const role = await resolveUserRole(supabase, user);
    if (!isAdminRole(role)) return setMessage("Admin access required.");
    const table = nextKind === "business" ? "local_businesses" : "community_organizations";
    const { data, error } = await supabase.from(table).select("id,name,image,image_urls,image_position_x,image_position_y,image_zoom,image_display_mode").eq("id", id).maybeSingle();
    if (error || !data) return setMessage(error?.message || "Listing not found.");
    setRecord(data); setMessage("");
  }

  useEffect(() => { void load(); }, []);

  const backHref = kind === "business" ? "/studio/businesses" : "/studio/community-orgs";
  return <main className="min-h-screen bg-slate-950 text-white"><StudioHeader/><section className="mx-auto max-w-5xl px-6 py-10"><a href={backHref} className="font-black text-pink-300">← Back to {kind === "business" ? "Businesses" : "Organizations"}</a><h1 className="mt-3 text-4xl font-black">Studio Directory Image Editor</h1><p className="mt-2 text-slate-300">Choose whether the public card fills the frame or shows the complete logo or flyer.</p>{message && <div className="mt-6 rounded-2xl bg-yellow-100 p-4 font-bold text-yellow-900">{message}</div>}{record && <div className="mt-6 rounded-3xl bg-white p-6 text-slate-950"><StudioDirectoryImageManager table={kind === "business" ? "local_businesses" : "community_organizations"} recordId={record.id} name={record.name} image={record.image} imageUrls={record.image_urls} positionX={record.image_position_x} positionY={record.image_position_y} zoom={record.image_zoom} displayMode={record.image_display_mode} folder={kind === "business" ? "businesses" : "organizations"} onSaved={load}/></div>}</section></main>;
}

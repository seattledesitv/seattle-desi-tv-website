"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PublicationCard from "../../components/publishing/PublicationCard";
import PublicationForm from "../../components/publishing/PublicationForm";
import StudioHeader from "../../components/StudioHeader";
import { getSupabaseBrowserClient } from "../../lib/supabaseBrowser";
import { isAdminRole, resolveUserRole } from "../../lib/roles";
import {
  archivePublication,
  createPublication,
  deleteDraftPublication,
  duplicatePublication,
  listPublications,
  updatePublication,
} from "../../lib/publishing/repository";
import type { PublicationDraftInput, PublicationRecord, SaveState } from "../../lib/publishing/types";
import { useCurrentSite } from "../../lib/sites/SiteContext";

const supabase = getSupabaseBrowserClient();
const emptyDraft: PublicationDraftInput = { name: "", edition_label: "", publication_type: "monthly", start_date: "", end_date: "", description: "" };

function toDraft(publication: PublicationRecord): PublicationDraftInput {
  return {
    name: publication.name,
    edition_label: publication.edition_label || "",
    publication_type: publication.publication_type,
    start_date: publication.start_date || "",
    end_date: publication.end_date || "",
    description: publication.description || "",
  };
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  const labels: Record<SaveState, string> = { idle: "No unsaved changes", saving: "Saving...", saved: savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Saved", error: "Save failed" };
  const tones: Record<SaveState, string> = { idle: "text-slate-500", saving: "text-blue-600", saved: "text-green-700", error: "text-red-600" };
  return <p className={`text-sm font-black ${tones[state]}`}>{labels[state]}</p>;
}

export default function PublishingPlatformPage() {
  const router = useRouter();
  const site = useCurrentSite();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [accessMessage, setAccessMessage] = useState("Checking Studio access...");
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<PublicationDraftInput>(emptyDraft);
  const [editing, setEditing] = useState<PublicationRecord | null>(null);
  const [editDraft, setEditDraft] = useState<PublicationDraftInput>(emptyDraft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const initialEditRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    const sessionResult = await supabase.auth.getSession();
    const user = sessionResult.data.session?.user;
    if (!user) { setAccessMessage("Please log in to access the Publishing Platform."); setLoading(false); return; }
    const role = await resolveUserRole(supabase, user);
    if (!isAdminRole(role)) { setAccessMessage("This account does not have Studio admin access."); setLoading(false); return; }
    setUserId(user.id);
    setAccessMessage("");
    try { if (!site.id) throw new Error("The current site is not configured."); setPublications(await listPublications(supabase, site.id)); }
    catch (error: any) { setErrorMessage(error.message || "Could not load publications."); }
    finally { setLoading(false); }
  }, [site.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!editing || !userId) return;
    const serialized = JSON.stringify(editDraft);
    if (!initialEditRef.current) { initialEditRef.current = serialized; return; }
    if (serialized === initialEditRef.current) { setSaveState("idle"); return; }
    setSaveState("saving");
    const timer = window.setTimeout(async () => {
      try {
        const updated = await updatePublication(supabase, editing.id, editDraft, userId);
        setEditing(updated);
        setPublications((current) => current.map((item) => item.id === updated.id ? updated : item));
        initialEditRef.current = JSON.stringify(toDraft(updated));
        setSavedAt(new Date());
        setSaveState("saved");
      } catch (error: any) {
        setErrorMessage(error.message || "Auto-save failed.");
        setSaveState("error");
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [editDraft, editing?.id, userId]);

  const grouped = useMemo(() => ({
    active: publications.filter((item) => item.status !== "published" && item.status !== "archived"),
    published: publications.filter((item) => item.status === "published"),
    archived: publications.filter((item) => item.status === "archived"),
  }), [publications]);

  async function handleCreate() {
    if (!userId || !draft.name.trim()) return;
    setBusyId("create"); setErrorMessage("");
    try {
      if (!site.id) throw new Error("The current site is not configured.");
      const created = await createPublication(supabase, draft, userId, site.id);
      setPublications((current) => [created, ...current]);
      setDraft(emptyDraft); setShowCreate(false);
      if (created.publication_type === "weekly_instagram") router.push(`/studio/publishing/${created.id}`);
      else openEditor(created);
    } catch (error: any) { setErrorMessage(error.message || "Could not create publication."); }
    finally { setBusyId(""); }
  }

  function openEditor(publication: PublicationRecord) {
    const next = toDraft(publication);
    setEditing(publication); setEditDraft(next); initialEditRef.current = JSON.stringify(next); setSaveState("idle"); setSavedAt(null);
  }

  async function handleDuplicate(publication: PublicationRecord) {
    setBusyId(publication.id); setErrorMessage("");
    try { const copy = await duplicatePublication(supabase, publication, userId); setPublications((current) => [copy, ...current]); }
    catch (error: any) { setErrorMessage(error.message || "Could not duplicate publication."); }
    finally { setBusyId(""); }
  }

  async function handleArchive(publication: PublicationRecord) {
    setBusyId(publication.id); setErrorMessage("");
    try { const archived = await archivePublication(supabase, publication.id, userId); setPublications((current) => current.map((item) => item.id === archived.id ? archived : item)); if (editing?.id === archived.id) setEditing(archived); }
    catch (error: any) { setErrorMessage(error.message || "Could not archive publication."); }
    finally { setBusyId(""); }
  }

  async function handleDelete(publication: PublicationRecord) {
    if (!window.confirm(`Delete draft “${publication.name}”? This cannot be undone.`)) return;
    setBusyId(publication.id); setErrorMessage("");
    try { await deleteDraftPublication(supabase, publication); setPublications((current) => current.filter((item) => item.id !== publication.id)); if (editing?.id === publication.id) setEditing(null); }
    catch (error: any) { setErrorMessage(error.message || "Could not delete publication."); }
    finally { setBusyId(""); }
  }

  function renderGroup(title: string, items: PublicationRecord[], emptyText: string) {
    return <section className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-2xl font-black">{title}</h2><span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black">{items.length}</span></div>{items.length ? <div className="grid gap-4 xl:grid-cols-2">{items.map((publication) => <PublicationCard key={publication.id} publication={publication} busy={busyId === publication.id} onOpen={openEditor} onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={handleDelete} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">{emptyText}</div>}</section>;
  }

  return <main className="min-h-screen bg-slate-100 text-slate-950"><StudioHeader /><div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-sm font-black uppercase tracking-[0.2em] text-pink-600">Publishing Platform</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Publications</h1><p className="mt-2 max-w-3xl text-slate-600">Create and manage publication drafts independently from the existing Newsletter Studio.</p></div>{userId && <button onClick={() => setShowCreate(true)} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white">+ New Publication</button>}</div>
    {errorMessage && <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700"><span>{errorMessage}</span><button onClick={() => setErrorMessage("")} aria-label="Dismiss">×</button></div>}
    {loading ? <div className="rounded-3xl bg-white p-8 font-bold">{accessMessage}</div> : !userId ? <div className="rounded-3xl bg-white p-8"><h2 className="text-2xl font-black">Studio Access</h2><p className="mt-3 text-slate-600">{accessMessage}</p></div> : <div className="space-y-10">{renderGroup("Drafts & Workflow", grouped.active, "No publication drafts yet.")}{renderGroup("Published", grouped.published, "No published editions yet.")}{renderGroup("Archived", grouped.archived, "No archived publications.")}</div>}
  </div>

  {showCreate && <div className="fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-slate-950/70 p-4"><section className="my-8 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5"><p className="text-xs font-black uppercase tracking-wide text-pink-600">New publication</p><h2 className="text-3xl font-black">Create a draft</h2></div><PublicationForm value={draft} busy={busyId === "create"} onChange={setDraft} onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setDraft(emptyDraft); }} /></section></div>}

  {editing && <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/70 p-4"><section className="mx-auto my-8 w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-black uppercase tracking-wide text-pink-600">Publication overview</p><h2 className="text-3xl font-black">{editing.name}</h2><p className="mt-1 text-sm font-bold uppercase text-slate-400">Status: {editing.status}</p></div><div className="flex items-center gap-4"><SaveIndicator state={saveState} savedAt={savedAt} /><button onClick={() => { setEditing(null); initialEditRef.current = ""; }} className="rounded-xl border border-slate-300 px-4 py-2 font-black">Close</button></div></div><PublicationForm value={editDraft} busy={saveState === "saving"} submitLabel="Save Now" onChange={setEditDraft} onSubmit={async () => { if (!editing || !userId) return; setSaveState("saving"); try { const updated = await updatePublication(supabase, editing.id, editDraft, userId); setEditing(updated); setPublications((current) => current.map((item) => item.id === updated.id ? updated : item)); initialEditRef.current = JSON.stringify(toDraft(updated)); setSavedAt(new Date()); setSaveState("saved"); } catch (error: any) { setErrorMessage(error.message || "Save failed."); setSaveState("error"); } }} /></section></div>}
  </main>;
}

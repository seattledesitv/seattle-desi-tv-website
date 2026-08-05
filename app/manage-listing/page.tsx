"use client";

import { useEffect, useMemo, useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { useListingManagementRequests } from "../hooks/useListingManagementRequests";
import type { ListingRequestType, ManagedListingType } from "../lib/listingManagement/types";

const labels: Record<ManagedListingType, string> = { event: "event", influencer: "influencer profile", community_group: "community group" };
const actionLabels: Record<ListingRequestType, string> = { claim: "Claim / manage", correction: "Suggest a correction", removal: "Request removal" };

export default function ManageListingPage() {
  const [entityType, setEntityType] = useState<ManagedListingType>("event");
  const [entityId, setEntityId] = useState("");
  const [entityName, setEntityName] = useState("Selected listing");
  const { user, requests, loading, saving, error, submit } = useListingManagementRequests();
  const [requestType, setRequestType] = useState<ListingRequestType>("claim");
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [relationship, setRelationship] = useState(""); const [details, setDetails] = useState(""); const [message, setMessage] = useState("");
  const relevant = useMemo(() => entityId ? requests.filter((request) => request.entity_type === entityType && request.entity_id === entityId) : requests, [requests, entityId, entityType]);

  // Query parameters identify the public listing after the page hydrates.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const query = new URLSearchParams(window.location.search); setEntityType((query.get("type") || "event") as ManagedListingType); setEntityId(query.get("id") || ""); setEntityName(query.get("name") || "Selected listing"); setRequestType((query.get("action") || "claim") as ListingRequestType); }, []);

  async function handleSubmit() {
    setMessage("");
    try {
      await submit({ entity_type: entityType, entity_id: entityId, entity_name: entityName, request_type: requestType, requester_name: name, requester_phone: phone, relationship, details });
      setMessage("Your request was sent to SDTV for review. You can track it below."); setDetails("");
    } catch (cause: unknown) { setMessage(cause instanceof Error ? cause.message : "Could not submit your request."); }
  }

  return <main className="min-h-screen bg-slate-50 text-slate-950"><SiteHeader />
    <section className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-sm font-black uppercase tracking-wide text-pink-600">Listing ownership & accuracy</p>
      <h1 className="mt-2 text-4xl font-black md:text-5xl">Manage a public listing</h1>
      <p className="mt-3 max-w-3xl text-slate-600">Claim an authorized listing, report information that needs correction, or ask SDTV to remove a listing. Every request is reviewed before any public change is made.</p>

      {entityId ? <section className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-pink-600">{labels[entityType]}</p><h2 className="mt-1 text-2xl font-black">{entityName}</h2>
        {!user?.id ? <a href={`/login?next=${encodeURIComponent(`/manage-listing?type=${entityType}&id=${entityId}&name=${entityName}`)}`} className="mt-5 inline-flex rounded-xl bg-pink-600 px-5 py-3 font-black text-white">Log in to continue</a> : <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-black">Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value as ListingRequestType)} className="rounded-xl border p-3 font-normal">{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-black">Your name<input value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black">Phone (optional)<input value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black">Your relationship{requestType === "claim" ? " *" : " (optional)"}<input value={relationship} onChange={(event) => setRelationship(event.target.value)} placeholder="Owner, organizer, authorized representative..." className="rounded-xl border p-3 font-normal" /></label>
          <label className="grid gap-1 text-sm font-black md:col-span-2">Details<textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder={requestType === "claim" ? "Explain how SDTV can verify your authority to manage this listing." : requestType === "correction" ? "Tell us what is incorrect and provide the correct information." : "Explain why this listing should no longer be public."} className="min-h-32 rounded-xl border p-3 font-normal" /></label>
          <button onClick={handleSubmit} disabled={saving} className="rounded-xl bg-pink-600 px-5 py-3 font-black text-white disabled:opacity-60 md:col-span-2">{saving ? "Sending..." : "Send for SDTV review"}</button>
        </div>}
        {(message || error) && <p className="mt-4 rounded-xl bg-yellow-50 p-4 font-bold text-yellow-900">{message || error}</p>}
      </section> : <div className="mt-8 rounded-3xl border bg-white p-6 font-bold text-slate-600">Open this page from an event, influencer, or community-group listing to start a request.</div>}

      <section className="mt-8"><h2 className="text-2xl font-black">My requests</h2>{loading ? <p className="mt-4 text-slate-500">Loading...</p> : relevant.length ? <div className="mt-4 grid gap-3">{relevant.map((request) => <article key={request.id} className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{request.entity_name} · {actionLabels[request.request_type]}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase">{request.status.replace("_", " ")}</span></div><p className="mt-2 text-sm text-slate-600">{request.details}</p>{request.admin_notes && <p className="mt-3 rounded-xl bg-pink-50 p-3 text-sm font-bold text-pink-900">SDTV: {request.admin_notes}</p>}</article>)}</div> : <p className="mt-4 rounded-2xl border bg-white p-5 text-slate-500">No requests yet.</p>}</section>
    </section><SiteFooter /></main>;
}

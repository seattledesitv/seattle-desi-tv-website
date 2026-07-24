"use client";

import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";
import EventOrganizationManager from "../components/EventOrganizationManager";

export default function MyEventOrganizationsPage() {
  return <main className="min-h-screen bg-slate-950 text-white"><MyHubHeader /><section className="mx-auto max-w-7xl px-6 py-10"><div className="mb-8"><p className="font-black uppercase tracking-wide text-pink-300">My Hub</p><h1 className="mt-2 text-4xl font-black md:text-5xl">Event Organizations</h1><p className="mt-2 max-w-3xl text-slate-300">Update the organizer, partner, sponsor, venue, charity, educational, or media relationships for events submitted from your account.</p><a href="/my-events" className="mt-5 inline-flex rounded-xl border border-white/20 px-4 py-3 font-black text-white">← Back to My Events</a></div><EventOrganizationManager mode="owner" /></section><SiteFooter /></main>;
}

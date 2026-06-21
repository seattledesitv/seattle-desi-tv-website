"use client";

import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";

export default function MyVideoAssignmentsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p>
        <h1 className="text-4xl md:text-5xl font-black mt-2">My Video Assignments</h1>
        <p className="text-slate-300 mt-2">Editor workspace coming online.</p>
      </section>
      <SiteFooter />
    </main>
  );
}

"use client";

import MyHubHeader from "../components/MyHubHeader";
import SiteFooter from "../components/SiteFooter";

export default function MyRoleRequestsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <MyHubHeader />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8"><p className="text-pink-300 font-black uppercase tracking-wide">My Hub</p><h1 className="text-4xl md:text-5xl font-black mt-2">My Role Requests</h1><p className="text-slate-300 mt-2">Track volunteer, crew, RJ, VJ, and admin role requests.</p></div>
        <div className="bg-white text-slate-950 rounded-3xl p-8">
          <h2 className="text-2xl font-black">Role Request Center</h2>
          <p className="text-gray-600 mt-3">This page is ready for the next phase where role requests and approvals will be surfaced from the database instead of the dashboard anchors.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

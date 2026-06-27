"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getSupabaseBrowserClient } from "../lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();
const defaults = [
  {
    section_key: "community_submit",
    display_order: 12,
    enabled: true,
    title: "Share Your Community Story",
    subtitle: "Community news, birthday wishes, announcements, celebrations, memories, photos, videos, and stories — send it to Seattle Desi TV.",
  },
  {
    section_key: "community_directory",
    display_order: 13,
    enabled: true,
    title: "Connect With Indian Community Groups & Organizations",
    subtitle: "Help the community discover WhatsApp groups, Facebook groups, cultural organizations, nonprofits, temples, associations, and local networks.",
  },
];

function sectionText(settings: any[], key: string) {
  return settings.find((item) => item.section_key === key) || defaults.find((item) => item.section_key === key);
}

function ShareStorySection({ title, subtitle }: { title: string; subtitle: string }) {
  return <section data-home-extra="community_submit" className="bg-slate-950 px-6 py-10 text-white md:px-10">
    <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-2xl shadow-black/30 md:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-pink-300">Community Voice</p>
          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">{subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/submit-content" className="rounded-xl bg-pink-600 px-5 py-4 text-center font-black text-white">Submit the Story</a>
            <a href="/contact" className="rounded-xl border border-white/20 bg-white/10 px-5 py-4 text-center font-black text-white">Ask SDTV</a>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Community News", "Birthday Wishes", "Photos & Videos", "Announcements"].map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
            <p className="text-lg font-black text-white">{item}</p>
            <p className="mt-2 text-sm font-bold text-slate-400">Share it with SDTV for review.</p>
          </div>)}
        </div>
      </div>
    </div>
  </section>;
}

function DirectorySection({ title, subtitle }: { title: string; subtitle: string }) {
  return <section data-home-extra="community_directory" className="bg-white px-6 py-10 text-slate-950 md:px-10">
    <div className="mx-auto max-w-7xl rounded-[2rem] border bg-white p-7 shadow-xl md:p-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-pink-600">Community Directory</p>
          <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">{subtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <a href="/community-groups" className="rounded-3xl border bg-slate-50 p-6 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-xs font-black uppercase tracking-wide text-pink-600">Groups</p>
            <h3 className="mt-2 text-2xl font-black">Community Groups</h3>
            <p className="mt-2 text-sm font-bold text-slate-600">WhatsApp, Facebook, Telegram, Meetup, and local networks.</p>
            <span className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white">View / Add Groups</span>
          </a>
          <a href="/community-organizations" className="rounded-3xl border bg-slate-50 p-6 transition hover:-translate-y-1 hover:shadow-xl">
            <p className="text-xs font-black uppercase tracking-wide text-pink-600">Organizations</p>
            <h3 className="mt-2 text-2xl font-black">Community Organizations</h3>
            <p className="mt-2 text-sm font-bold text-slate-600">Cultural orgs, nonprofits, temples, associations, and clubs.</p>
            <span className="mt-4 inline-flex rounded-xl bg-pink-600 px-4 py-3 text-sm font-black text-white">View / Add Orgs</span>
          </a>
        </div>
      </div>
    </div>
  </section>;
}

export default function HomeCommunityCallouts() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [settings, setSettings] = useState<any[]>(defaults);
  const [isHome, setIsHome] = useState(false);

  useEffect(() => {
    if (window.location.pathname !== "/") return;
    setIsHome(true);
    const host = document.createElement("div");
    host.id = "home-community-callouts";
    const contact = document.getElementById("contact");
    if (contact?.parentNode) contact.parentNode.insertBefore(host, contact.nextSibling);
    else document.querySelector("main")?.appendChild(host);
    setMount(host);
    return () => { host.remove(); };
  }, []);

  useEffect(() => {
    if (!isHome) return;
    async function loadSettings() {
      const { data } = await supabase.from("homepage_settings").select("section_key,display_order,enabled,title,subtitle").in("section_key", ["community_submit", "community_directory"]);
      if (Array.isArray(data) && data.length > 0) {
        const merged = defaults.map((item) => ({ ...item, ...(data.find((row: any) => row.section_key === item.section_key) || {}) }));
        setSettings(merged);
      }
    }
    loadSettings();
  }, [isHome]);

  const sections = useMemo(() => settings.filter((item) => item.enabled !== false).sort((a, b) => Number(a.display_order || 999) - Number(b.display_order || 999)), [settings]);
  if (!mount || !isHome) return null;

  return createPortal(<>{sections.map((item) => item.section_key === "community_submit" ? <ShareStorySection key={item.section_key} title={sectionText(settings, "community_submit")?.title || defaults[0].title} subtitle={sectionText(settings, "community_submit")?.subtitle || defaults[0].subtitle} /> : <DirectorySection key={item.section_key} title={sectionText(settings, "community_directory")?.title || defaults[1].title} subtitle={sectionText(settings, "community_directory")?.subtitle || defaults[1].subtitle} />)}</>, mount);
}

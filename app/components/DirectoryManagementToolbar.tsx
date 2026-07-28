"use client";

import { useEffect, useMemo, useState } from "react";

type DirectoryKind = "businesses" | "organizations";

type ToolbarLink = {
  label: string;
  href: string;
  emphasis?: boolean;
};

const configs: Record<DirectoryKind, { title: string; links: ToolbarLink[] }> = {
  businesses: {
    title: "Business tools",
    links: [
      { label: "Generate Businesses", href: "/studio/directory-generator?kind=businesses", emphasis: true },
      { label: "Business Claims", href: "/studio/business-claims" },
      { label: "Research Queue", href: "/studio/businesses?queue=research" },
      { label: "Missing Websites", href: "/studio/businesses?queue=missing-website" },
      { label: "Missing Images", href: "/studio/businesses?queue=missing-image" },
      { label: "Needs Review", href: "/studio/businesses?queue=needs-review" },
    ],
  },
  organizations: {
    title: "Organization tools",
    links: [
      { label: "Generate Organizations", href: "/studio/directory-generator?kind=organizations", emphasis: true },
      { label: "Premium & Hero", href: "/studio/community-orgs/premium" },
      { label: "Research Queue", href: "/studio/community-orgs?queue=research" },
      { label: "Missing Websites", href: "/studio/community-orgs?queue=missing-website" },
      { label: "Missing Images", href: "/studio/community-orgs?queue=missing-image" },
      { label: "Needs Review", href: "/studio/community-orgs?queue=needs-review" },
    ],
  },
};

export default function DirectoryManagementToolbar() {
  const [pathname, setPathname] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPathname(window.location.pathname || "");
    setSearch(window.location.search || "");
  }, []);

  const kind = useMemo<DirectoryKind | null>(() => {
    if (pathname === "/studio/businesses") return "businesses";
    if (pathname === "/studio/community-orgs") return "organizations";
    return null;
  }, [pathname]);

  if (!kind) return null;
  const config = configs[kind];
  const currentQueue = new URLSearchParams(search).get("queue") || "";

  return (
    <div className="border-b border-white/10 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-300">{config.title}</p>
            <p className="mt-1 text-sm text-slate-300">Generate, research and review only {kind}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.links.map((link) => {
              const queue = new URL(link.href, "https://sdtv.local").searchParams.get("queue") || "";
              const active = queue && queue === currentQueue;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-2 text-sm font-black transition ${link.emphasis ? "bg-pink-600 text-white hover:bg-pink-500" : active ? "bg-white text-slate-950" : "bg-white/10 text-white hover:bg-white/20"}`}
                >
                  {link.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

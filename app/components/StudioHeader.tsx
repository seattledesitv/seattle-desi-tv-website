"use client";

import { useEffect, useState } from "react";
import AccountMenu from "./AccountMenu";

const primaryLinks = [
  ["Dashboard", "/studio"],
  ["Event Operations", "/studio/event-ops-v2"],
  ["User Control", "/studio/users"],
];

const groups = [
  {
    title: "Website",
    links: [
      ["Homepage", "/studio/homepage"],
      ["Hero", "/studio/hero"],
      ["Featured Events", "/studio/featured-events"],
      ["Featured Social", "/studio/featured-social"],
      ["Social Media Stats", "/studio/social-stats"],
      ["Testimonials", "/studio/testimonials"],
      ["Team Page Management", "/studio/team-page"],
      ["Sponsors", "/studio/sponsors"],
    ],
  },
  { title: "Operations", links: [["Event Operations", "/studio/event-ops-v2"], ["Video Upload Folders", "/studio/event-upload-folders"]] },
  {
    title: "People",
    links: [
      ["User Control", "/studio/users"],
      ["ID Badges", "/studio/id-badges"],
      ["Volunteers", "/studio/volunteers"],
      ["Team", "/studio/team"],
      ["Recognition", "/studio/recognition"],
      ["Roles", "/studio/roles"],
      ["Influencer Management", "/studio/influencer-management"],
      ["Influencer Applications", "/studio/influencer-ops"],
      ["Influencer Directory", "/studio/influencers"],
    ],
  },
  {
    title: "Media",
    links: [
      ["Video Production", "/studio/video-production"],
      ["Community Content", "/studio/community-content"],
      ["Instagram Publisher", "/studio/instagram-publisher"],
      ["Radio", "/studio/radio-team"],
      ["Social Diagnostics", "/studio/social-diagnostics"],
    ],
  },
  { title: "Communications", links: [["Newsletter", "/studio/newsletter"]] },
  {
    title: "Community",
    links: [
      ["Businesses", "/studio/businesses"],
      ["Community Groups", "/studio/community-groups"],
      ["Community Orgs", "/studio/community-orgs"],
      ["Contact Requests", "/studio/contact-requests"],
    ],
  },
  {
    title: "System",
    links: [
      ["Finance Management", "/studio/finance"],
      ["Analytics", "/studio/analytics"],
      ["Database Backup", "/studio/database-backup"],
      ["Database Import", "/studio/database-import"],
    ],
  },
];

function readStatus(section: Element) {
  const text = (section.textContent || "").toLowerCase();
  const known = [
    "published complete",
    "approved for publishing",
    "awaiting admin approval",
    "awaiting crew review",
    "changes requested",
    "in editing",
    "ready for editing",
  ];
  return known.find((item) => text.includes(`current status:${item}`) || text.includes(`current status: ${item}`) || text.includes(item)) || "not started";
}

function statusGuidance(status: string) {
  if (status === "ready for editing" || status === "not started") return { tone: "bg-blue-50 border-blue-100 text-blue-900", waiting: "Admin", title: "Submit this event to an editor", action: "Choose an editor, set priority, then click Assign & Submit to Editor.", button: "Assign & Submit to Editor" };
  if (status === "in editing") return { tone: "bg-yellow-50 border-yellow-100 text-yellow-900", waiting: "Video Editor", title: "Editor is working", action: "No admin approval is needed right now. Use Email Editor only if you need a status update.", button: "Email Editor" };
  if (status === "awaiting crew review") return { tone: "bg-yellow-50 border-yellow-100 text-yellow-900", waiting: "Crew Reviewer", title: "Waiting for crew review", action: "Crew needs to review the editor draft. Use Communications → Crew if you want to remind them.", button: "Email Crew" };
  if (status === "changes requested") return { tone: "bg-orange-50 border-orange-100 text-orange-900", waiting: "Video Editor", title: "Changes requested", action: "The editor needs to revise the draft based on feedback. Use Email Editor if follow-up is needed.", button: "Email Editor" };
  if (status === "awaiting admin approval") return { tone: "bg-pink-50 border-pink-100 text-pink-900", waiting: "Admin", title: "Admin approval needed", action: "Review the draft in Video Production, then click Approve for Publishing if it is ready.", button: "Approve for Publishing" };
  if (status === "approved for publishing") return { tone: "bg-purple-50 border-purple-100 text-purple-900", waiting: "Video Editor", title: "Ready to publish", action: "The editor can publish and then mark the workflow complete.", button: "Email Editor" };
  return { tone: "bg-green-50 border-green-100 text-green-900", waiting: "Complete", title: "Workflow complete", action: "No further admin action is required for this event video.", button: "View Timeline" };
}

function enhanceEventOpsVideoTab() {
  if (typeof window === "undefined" || !window.location.pathname.startsWith("/studio/event-ops-v2")) return;
  const headings = Array.from(document.querySelectorAll("h3")).filter((h) => h.textContent?.trim() === "Video Workflow");
  headings.forEach((heading) => {
    const section = heading.closest("section");
    if (!section || section.getAttribute("data-sdtv-video-enhanced") === "yes") return;
    section.setAttribute("data-sdtv-video-enhanced", "yes");
    const status = readStatus(section);
    const guidance = statusGuidance(status);

    const helper = document.createElement("div");
    helper.className = `mb-5 rounded-2xl border p-5 ${guidance.tone}`;
    helper.innerHTML = `
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-black uppercase tracking-wide opacity-80">Admin Video Workflow Guidance</p>
          <h4 class="mt-1 text-2xl font-black capitalize">${guidance.title}</h4>
          <p class="mt-2 text-sm"><b>Current status:</b> ${status}</p>
          <p class="mt-1 text-sm"><b>Waiting on:</b> ${guidance.waiting}</p>
          <p class="mt-2 text-sm">${guidance.action}</p>
        </div>
        <div class="rounded-xl bg-white/70 px-4 py-3 text-center text-sm font-black shadow-sm">Recommended<br/>${guidance.button}</div>
      </div>
      <div class="mt-4 grid gap-2 text-xs font-black md:grid-cols-5">
        ${["Submitted", "Editing", "Crew Review", "Admin Approval", "Published"].map((step) => `<span class="rounded-full bg-white/70 px-3 py-2 text-center">${step}</span>`).join("")}
      </div>`;
    heading.insertAdjacentElement("afterend", helper);

    const statusButtons = Array.from(section.querySelectorAll("button")).filter((button) => ["ready for editing", "in editing", "awaiting crew review", "changes requested", "awaiting admin approval", "approved for publishing", "published complete"].includes((button.textContent || "").trim().toLowerCase()));
    statusButtons.forEach((button) => {
      const htmlButton = button as HTMLButtonElement;
      const text = (htmlButton.textContent || "").trim().toLowerCase();
      htmlButton.title = "Advanced manual status override. Use only when correcting workflow state.";
      htmlButton.classList.add("opacity-60");
      if (text !== status) htmlButton.classList.add("border", "border-dashed", "border-slate-300");
    });

    const submitButton = Array.from(section.querySelectorAll("button")).find((button) => (button.textContent || "").includes("Assign & Submit")) as HTMLButtonElement | undefined;
    if (submitButton && !["ready for editing", "not started"].includes(status)) {
      submitButton.disabled = true;
      submitButton.classList.add("opacity-40", "cursor-not-allowed");
      submitButton.title = "This action is only needed before the editor starts work.";
    }
  });
}

export default function StudioHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState("");
  const [pathname, setPathname] = useState("");
  useEffect(() => { setPathname(window.location.pathname || ""); }, []);
  useEffect(() => {
    enhanceEventOpsVideoTab();
    const id = window.setInterval(enhanceEventOpsVideoTab, 700);
    return () => window.clearInterval(id);
  }, [pathname]);
  function toggleGroup(title: string) { setOpenGroup((current) => (current === title ? "" : title)); }
  function isActive(href: string) { return pathname === href || pathname.startsWith(`${href}/`); }
  function navClass(href: string, primary = false) { if (isActive(href)) return "bg-pink-600 text-white ring-1 ring-pink-200/40 shadow-lg shadow-pink-900/30"; return primary ? "bg-white/10 hover:bg-pink-600 text-white" : "bg-white/10 hover:bg-white/20 text-white"; }

  return <div className="bg-slate-950 text-white border-b border-white/10"><div className="max-w-7xl mx-auto px-4 md:px-6 py-4"><div className="flex flex-col gap-3"><div className="flex items-start justify-between gap-3"><div><a href="/" className="text-pink-300 font-bold text-sm">Public Site</a><h1 className="text-2xl font-black">SDTV Studio</h1></div><div className="flex items-center gap-2 shrink-0"><AccountMenu tone="dark" from="studio" /><button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="lg:hidden border border-white/20 px-3 py-2 rounded-lg transition text-sm font-black">{menuOpen ? "Close" : "Menu"}</button></div></div>
    <nav className="hidden lg:grid gap-2 text-sm font-bold" onMouseLeave={() => setOpenGroup("")}> 
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2">{primaryLinks.map(([label, href]) => <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={`${navClass(href, true)} px-3 py-2 rounded-lg transition`}>{label}</a>)}</div>
      <div className="flex flex-wrap items-center gap-2">{groups.map((group) => { const isOpen = openGroup === group.title; const groupActive = group.links.some(([, href]) => isActive(href)); return <div key={group.title} className="relative" onMouseEnter={() => setOpenGroup(group.title)}><button type="button" onClick={() => toggleGroup(group.title)} aria-expanded={isOpen} className={`${groupActive ? "bg-pink-600 text-white ring-1 ring-pink-200/40" : "bg-white/10 hover:bg-white/20 text-white"} px-3 py-2 rounded-lg transition`}>{group.title} ▾</button>{isOpen && <div className="absolute left-0 top-full z-50 min-w-64 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">{group.links.map(([label, href]) => <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setOpenGroup("")} className={`${isActive(href) ? "bg-pink-600 ring-1 ring-pink-200/40" : "hover:bg-pink-600"} block rounded-xl px-3 py-2 text-sm text-white`}>{label}</a>)}</div>}</div>; })}</div>
    </nav>
    {menuOpen && <nav className="lg:hidden grid gap-3 text-sm font-bold"><div className="grid grid-cols-1 gap-2">{primaryLinks.map(([label, href]) => <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${navClass(href, true)} px-3 py-3 rounded-lg transition text-center`}>{label}</a>)}</div>{groups.map((group) => <div key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-3"><p className="mb-2 text-xs font-black uppercase tracking-wide text-pink-200">{group.title}</p><div className="grid grid-cols-2 gap-2">{group.links.map(([label, href]) => <a key={href} href={href} aria-current={isActive(href) ? "page" : undefined} onClick={() => setMenuOpen(false)} className={`${isActive(href) ? "bg-pink-600 ring-1 ring-pink-200/40" : "bg-white/10 hover:bg-pink-600"} px-3 py-3 rounded-lg transition text-center`}>{label}</a>)}</div></div>)}</nav>}
  </div></div></div>;
}

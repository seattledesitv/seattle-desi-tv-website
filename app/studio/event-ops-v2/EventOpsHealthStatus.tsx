"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Health = {
  label: string;
  tone: "green" | "yellow" | "red";
  detail: string;
};

function parseNumber(text: string, label: string) {
  const index = text.toLowerCase().indexOf(label.toLowerCase());
  if (index < 0) return 0;
  const before = text.slice(Math.max(0, index - 12), index);
  const match = before.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

function computeHealth(text: string): Health | null {
  if (!text.includes("Crew approved") || !text.includes("Influencers") || !text.includes("Media submitted")) return null;
  const lower = text.toLowerCase();
  const pending = parseNumber(text, "Pending actions");
  const media = parseNumber(text, "Media submitted");
  const uncovered = lower.includes("uncovered");
  const needsCrew = lower.includes("need crew");
  const needsInfluencer = lower.includes("need influencer");
  const fullyCovered = lower.includes("fully covered");

  if (uncovered || needsCrew) {
    return { label: "Red", tone: "red", detail: uncovered ? "No confirmed coverage yet." : "Crew coverage is still needed." };
  }
  if (needsInfluencer || pending > 0 || media === 0) {
    return { label: "Yellow", tone: "yellow", detail: needsInfluencer ? "Crew exists, but influencer coverage is missing." : pending > 0 ? "There are pending actions to close." : "Coverage exists, but media has not been submitted yet." };
  }
  if (fullyCovered) {
    return { label: "Green", tone: "green", detail: "Crew and influencer coverage are ready." };
  }
  return { label: "Yellow", tone: "yellow", detail: "Review coverage before marking this event complete." };
}

function findSlot() {
  const tabs = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Overview");
  const tabCard = tabs?.closest("div.rounded-3xl");
  const rightColumn = tabCard?.parentElement;
  if (!rightColumn || !tabCard) return null;
  let slot = rightColumn.querySelector(".event-health-status-slot") as HTMLElement | null;
  if (!slot) {
    slot = document.createElement("div");
    slot.className = "event-health-status-slot";
    rightColumn.insertBefore(slot, tabCard);
  }
  return slot;
}

function findSelectedPanelText() {
  const tabs = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Overview");
  const tabCard = tabs?.closest("div.rounded-3xl");
  const rightColumn = tabCard?.parentElement;
  return rightColumn?.textContent || "";
}

export default function EventOpsHealthStatus() {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const refresh = () => {
      setSlot(findSlot());
      setHealth(computeHealth(findSelectedPanelText()));
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, []);

  if (!slot || !health) return null;
  const styles = health.tone === "green"
    ? "border-green-200 bg-green-50 text-green-900"
    : health.tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-yellow-200 bg-yellow-50 text-yellow-900";
  const dot = health.tone === "green" ? "bg-green-600" : health.tone === "red" ? "bg-red-600" : "bg-yellow-500";

  return createPortal(<section className={`mb-5 rounded-3xl border p-5 ${styles}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className={`h-4 w-4 rounded-full ${dot}`} />
        <div>
          <p className="text-xs font-black uppercase tracking-wide">Overall Event Status</p>
          <h3 className="text-2xl font-black">{health.label}</h3>
        </div>
      </div>
      <p className="max-w-xl text-sm font-bold">{health.detail}</p>
    </div>
  </section>, slot);
}

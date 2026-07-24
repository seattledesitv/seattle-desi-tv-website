"use client";

import { useEffect } from "react";

const bioPlaceholder = "Tell us a little about yourself. This may be used when introducing you to the Seattle Desi TV team and community. Include your background, hobbies or interests, why you joined SDTV, what you are passionate about, and anything you would like the team to know.";

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function findField(labelText: string) {
  const labels = Array.from(document.querySelectorAll("label"));
  const label = labels.find((item) => (item.querySelector("span")?.textContent || "").trim().toLowerCase().includes(labelText.toLowerCase()));
  return label?.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null;
}

function enhanceStudio() {
  const path = window.location.pathname;

  if (path.startsWith("/studio/users")) {
    const labels = Array.from(document.querySelectorAll("label"));
    const bioLabel = labels.find((item) => (item.querySelector("span")?.textContent || "").trim() === "Bio");
    const textarea = bioLabel?.querySelector("textarea") as HTMLTextAreaElement | null;
    if (textarea && !textarea.placeholder) {
      textarea.placeholder = bioPlaceholder;
      textarea.rows = Math.max(textarea.rows || 0, 6);
      const title = bioLabel?.querySelector("span");
      if (title && title.textContent === "Bio") title.textContent = "Bio (Used for Team Introductions)";
    }
  }

  const studioTitle = Array.from(document.querySelectorAll("h1")).find((item) => item.textContent?.trim() === "SDTV Studio");
  const titleBlock = studioTitle?.parentElement;
  if (titleBlock && !titleBlock.querySelector("[data-team-welcome-link]")) {
    const link = document.createElement("a");
    link.href = "/studio/team-welcome";
    link.textContent = "Team Welcome Center";
    link.setAttribute("data-team-welcome-link", "true");
    link.className = "ml-3 inline-flex rounded-lg bg-pink-600 px-3 py-1.5 text-xs font-black text-white hover:bg-pink-500";
    studioTitle?.insertAdjacentElement("afterend", link);
  }

  if (path.startsWith("/studio/instagram-publisher")) {
    const params = new URLSearchParams(window.location.search);
    const imageUrl = params.get("imageUrl") || "";
    const caption = params.get("caption") || "";
    const postContext = params.get("postContext") || "";
    const marker = document.body.getAttribute("data-instagram-prefilled");
    if (!marker && (imageUrl || caption || postContext)) {
      const imageField = findField("Image URL");
      const captionField = findField("Caption");
      const contextField = findField("post context");
      if (imageField && captionField) {
        if (imageUrl) setNativeValue(imageField, imageUrl);
        if (caption) setNativeValue(captionField, caption);
        if (postContext && contextField) setNativeValue(contextField, postContext);
        document.body.setAttribute("data-instagram-prefilled", "true");
      }
    }
  }
}

export default function StudioEnhancements() {
  useEffect(() => {
    enhanceStudio();
    const timer = window.setInterval(enhanceStudio, 500);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}

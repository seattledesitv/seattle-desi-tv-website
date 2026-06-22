"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isMobileInstallTarget() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
  if (isStandalone) return false;
  return isAndroid && !isIOS;
}

export default function InstallPWAButton({ compact = false }: { compact?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [mobileInstallTarget, setMobileInstallTarget] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMobileInstallTarget(isMobileInstallTarget());

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (isMobileInstallTarget()) setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    setInstallPrompt(null);
  }

  if (installed || !mobileInstallTarget || !installPrompt) return null;

  if (compact) {
    return <button type="button" onClick={installApp} className="bg-pink-600 text-white px-4 py-2 rounded-xl font-black text-sm shadow-lg">Install SDTV App</button>;
  }

  return (
    <div className="bg-white text-slate-950 rounded-2xl p-5 shadow-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-pink-600">Seattle Desi TV App</p>
        <h2 className="text-xl font-black mt-1">Install SDTV on your phone</h2>
        <p className="text-gray-600 text-sm mt-1">Open events, radio, My Hub, and SDTV updates faster from your home screen.</p>
      </div>
      <button type="button" onClick={installApp} className="bg-pink-600 text-white px-5 py-3 rounded-xl font-black whitespace-nowrap">Install SDTV App</button>
    </div>
  );
}

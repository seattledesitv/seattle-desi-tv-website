"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NOTICE_VERSION = "2026-09-25-v1";
const STORAGE_KEY = `sdtv-community-disclaimer-${NOTICE_VERSION}`;

export default function CommunityPurposeDisclaimer() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "acknowledged") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    buttonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // The notice can still be dismissed when browser storage is unavailable.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-purpose-title"
      aria-describedby="community-purpose-description"
      className="fixed inset-0 z-[2000] grid place-items-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm md:p-8"
    >
      <section className="my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/15 bg-white text-slate-950 shadow-2xl">
        <div className="bg-[#050b18] px-6 py-6 text-white md:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">
            Community-purpose notice
          </p>
          <h2
            id="community-purpose-title"
            className="mt-2 text-3xl font-black md:text-4xl"
          >
            Seattle Desi TV is a nonprofit community platform
          </h2>
        </div>
        <div className="space-y-4 px-6 py-6 md:px-8 md:py-7">
          <div
            id="community-purpose-description"
            className="space-y-4 leading-7 text-slate-700"
          >
            <p>
              Seattle Desi TV is a nonprofit organization recognized as
              tax-exempt under Section 501(c)(3). Our website and programs are
              operated for community, cultural, educational, and charitable
              purposes.
            </p>
            <p>
              The appearance of any business, organization, event, individual,
              product, service, link, interview, or submitted content does not
              by itself constitute an endorsement, recommendation, guarantee, or
              advocacy by Seattle Desi TV. Paid sponsorships, advertisements,
              and promotional placements should be identified as such.
            </p>
            <p>
              Community and third-party information may be submitted by others.
              Visitors should independently verify important details and make
              their own decisions. Seattle Desi TV does not endorse or oppose
              any candidate for public office or political party.
            </p>
          </div>
          <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-950">
            By continuing, you acknowledge that you have read this notice. This
            notice does not replace the full Terms &amp; Conditions or other
            applicable policies.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/community-disclaimer"
              onClick={acknowledge}
              className="text-center font-black text-pink-700 underline"
            >
              Read the full disclaimer
            </Link>
            <button
              ref={buttonRef}
              type="button"
              onClick={acknowledge}
              className="rounded-xl bg-pink-600 px-6 py-4 font-black text-white shadow-lg"
            >
              I Understand — Continue
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

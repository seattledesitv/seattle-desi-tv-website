import type { ReactNode } from "react";

export default function HomeV2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Home V2 recognition-specific gold wave layer */
        main > section:has(a[href="/recognition"]) {
          isolation: isolate;
          overflow: hidden !important;
          border-top: 0 !important;
          border-bottom: 0 !important;
          background:
            radial-gradient(circle at 8% 18%, rgba(250, 204, 21, 0.22), transparent 15rem),
            radial-gradient(circle at 86% 20%, rgba(236, 72, 153, 0.26), transparent 19rem),
            linear-gradient(100deg, #150516 0%, #260817 48%, #110411 100%) !important;
        }

        main > section:has(a[href="/recognition"]) > div:first-child,
        main > section:has(a[href="/recognition"]) > div:last-child {
          color: #fff !important;
          opacity: 1;
          position: relative;
          z-index: 3;
        }

        main > section:has(a[href="/recognition"]) > div:first-child svg,
        main > section:has(a[href="/recognition"]) > div:last-child svg {
          filter: drop-shadow(0 0 16px rgba(250, 204, 21, 0.20));
        }

        main > section:has(a[href="/recognition"])::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background:
            radial-gradient(circle, rgba(250,204,21,.55) 1px, transparent 1.7px),
            radial-gradient(circle, rgba(255,255,255,.16) 1px, transparent 1.6px);
          background-size: 38px 38px, 72px 72px;
          background-position: 0 0, 18px 10px;
          mask-image: linear-gradient(90deg, black 0%, transparent 32%, transparent 67%, black 100%);
          opacity: .72;
        }

        main > section:has(a[href="/recognition"])::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 0% 8%, rgba(250,204,21,.38), transparent 22%),
            radial-gradient(ellipse at 100% 94%, rgba(250,204,21,.52), transparent 27%),
            linear-gradient(166deg, transparent 0 18%, rgba(250,204,21,.16) 18.6%, rgba(255,214,87,.34) 20%, rgba(250,204,21,.08) 22.5%, transparent 25%),
            linear-gradient(352deg, transparent 0 70%, rgba(250,204,21,.12) 71%, rgba(255,214,87,.32) 73%, rgba(250,204,21,.08) 75%, transparent 78%),
            linear-gradient(174deg, transparent 0 78%, rgba(250,204,21,.24) 79%, rgba(255,214,87,.45) 81%, rgba(250,204,21,.09) 84%, transparent 88%);
          filter: blur(.1px);
          opacity: .95;
        }

        main > section:has(a[href="/recognition"]) > div.relative.max-w-7xl {
          z-index: 4 !important;
          padding-top: 2.15rem !important;
          padding-bottom: 2.1rem !important;
        }

        main > section:has(a[href="/recognition"]) h2 {
          text-shadow: 0 2px 18px rgba(0,0,0,.38);
        }

        main > section:has(a[href="/recognition"]) a[href="/recognition"].inline-block {
          background: linear-gradient(135deg, #ffd95a 0%, #facc15 45%, #c87800 100%) !important;
          border: 1px solid rgba(255, 235, 150, .72);
          box-shadow: 0 10px 26px rgba(250, 204, 21, .28), inset 0 1px 0 rgba(255,255,255,.45) !important;
        }

        main > section:has(a[href="/recognition"]) .flex.flex-wrap.items-end > a > div {
          position: relative;
        }

        main > section:has(a[href="/recognition"]) .flex.flex-wrap.items-end > a > div::after {
          content: "";
          position: absolute;
          inset: -9px;
          border-radius: 999px;
          border: 1px solid rgba(250,204,21,.24);
          box-shadow: 0 0 24px rgba(250,204,21,.18);
          pointer-events: none;
        }
      ` }} />
      {children}
    </>
  );
}

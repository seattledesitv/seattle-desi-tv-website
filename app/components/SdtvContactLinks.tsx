export const SDTV_PHONE_DISPLAY = "+1 (425) 439-SDTV";
export const SDTV_PHONE_TEL = "+14254397838";
export const SDTV_WHATSAPP_CHAT = "https://wa.me/14254397838?text=Hi%20Seattle%20Desi%20TV!%20I%20would%20like%20to%20know%20more.";
export const SDTV_WHATSAPP_GROUP = "https://chat.whatsapp.com/JLcTwKowPeDFySvoNv5sXm";

const links = [
  { label: "Call SDTV", detail: SDTV_PHONE_DISPLAY, href: `tel:${SDTV_PHONE_TEL}`, icon: "☎" },
  { label: "WhatsApp SDTV", detail: "Send us a message", href: SDTV_WHATSAPP_CHAT, icon: "💬", external: true },
  { label: "Join Fan Club", detail: "WhatsApp group", href: SDTV_WHATSAPP_GROUP, icon: "👥", external: true },
];

export function SdtvContactButtons({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-3"}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.external ? "_blank" : undefined}
          rel={link.external ? "noreferrer" : undefined}
          className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left font-black text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-lg" aria-hidden="true">{link.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm leading-tight">{link.label}</span>
            <span className="block truncate text-xs font-bold text-slate-300">{link.detail}</span>
          </span>
        </a>
      ))}
    </div>
  );
}

export function FloatingWhatsAppButton() {
  return (
    <a
      href={SDTV_WHATSAPP_CHAT}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/30 transition hover:-translate-y-0.5 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-300 md:bottom-6 md:right-6"
      aria-label="Chat with Seattle Desi TV on WhatsApp"
    >
      <span aria-hidden="true">💬</span>
      <span className="hidden sm:inline">WhatsApp SDTV</span>
    </a>
  );
}

export default function SdtvContactLinks() {
  return <SdtvContactButtons />;
}

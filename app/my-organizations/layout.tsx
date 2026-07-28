import type { ReactNode } from "react";

export default function MyOrganizationsLayout({ children }: { children: ReactNode }) {
  return <>{children}<a href="/my-organizations/link-event" className="fixed bottom-5 right-5 z-50 rounded-full bg-emerald-600 px-5 py-3 font-black text-white shadow-2xl hover:bg-emerald-700">Link an Event</a></>;
}

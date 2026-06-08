"use client";

import { usePathname } from "next/navigation";
import ContactCTA from "./ContactCTA";

export default function FooterContactGate() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <ContactCTA />;
}

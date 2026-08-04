import { redirect } from "next/navigation";

export default function LegacyNewEventPage() {
  redirect("/events?add=1");
}

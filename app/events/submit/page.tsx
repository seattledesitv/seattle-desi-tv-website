import { redirect } from "next/navigation";

export default function LegacySubmitEventPage() {
  redirect("/events?add=1");
}

"use client";
import { useRadioSchedule } from "../../hooks/useRadioSchedule";
import { useCurrentSite } from "../../lib/sites/SiteContext";
import type { RadioProgram } from "../../lib/radioSchedule/types";

const weekdays = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
function localDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
function zoneLabel(timezone: string) {
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value || timezone
  );
}
function localTime(value: string | null) {
  if (!value) return "";
  const [h, m] = value.split(":");
  const date = new Date(2000, 0, 1, Number(h), Number(m));
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
function host(program: RadioProgram, city: string) {
  return program.host?.name || program.host_name || `${city} Desi Radio`;
}

export default function RadioSchedule() {
  const site = useCurrentSite();
  const { upcoming, recurring, loading, error } = useRadioSchedule("public");
  if (loading)
    return (
      <div className="rounded-2xl border bg-white p-8 text-slate-500">
        Loading radio schedule...
      </div>
    );
  if (error)
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-red-800">
        The schedule is temporarily unavailable.
      </div>
    );
  if (!upcoming.length && !recurring.length)
    return (
      <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
        <h3 className="text-2xl font-black">New shows coming soon</h3>
        <p className="mt-2 text-slate-600">
          Our team will update the {site.city} Desi Radio schedule shortly.
        </p>
      </div>
    );
  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-4 text-2xl font-black">Upcoming Shows</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((program) => (
              <article
                key={program.id}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <p className="font-black uppercase tracking-wide text-pink-600">
                  {localDate(program.starts_at!, site.timezone)}
                </p>
                <h4 className="mt-2 text-2xl font-black">{program.title}</h4>
                <p className="mt-1 font-bold text-slate-600">
                  Hosted by {host(program, site.city)}
                </p>
                {program.description && (
                  <p className="mt-3 text-slate-600">{program.description}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
      {recurring.length > 0 && (
        <div>
          <h3 className="mb-4 text-2xl font-black">Regular Programming</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recurring.map((program) => (
              <article
                key={program.id}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <p className="font-black uppercase tracking-wide text-pink-600">
                  {program.schedule_type === "daily"
                    ? "Every day"
                    : program.days_of_week
                        .map((day) => weekdays[day])
                        .join(", ")}
                </p>
                <h4 className="mt-2 text-xl font-black">{program.title}</h4>
                <p className="mt-1 font-bold text-slate-600">
                  {localTime(program.start_time)}–{localTime(program.end_time)}{" "}
                  {zoneLabel(program.timezone || site.timezone)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Hosted by {host(program, site.city)}
                </p>
                {program.description && (
                  <p className="mt-3 text-slate-600">{program.description}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

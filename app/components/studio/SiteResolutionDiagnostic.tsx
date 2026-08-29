import { resolveCurrentSite } from "../../lib/sites/siteResolver";

const sourceLabel = {
  domain: "Matched domain",
  preview: "Preview override",
  default: "Default market",
  fallback: "Built-in fallback",
} as const;

export default async function SiteResolutionDiagnostic() {
  const site = await resolveCurrentSite();
  const warning = site.source === "fallback";

  return (
    <div className={`border-b px-4 py-2 text-xs font-bold ${warning ? "border-amber-300 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-950"}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span>
          Site context: {site.name} ({site.code.toUpperCase()}) · {site.hostname}
        </span>
        <span>
          {sourceLabel[site.source]} · primary: {site.primaryHostname} · {site.timezone}
        </span>
      </div>
    </div>
  );
}

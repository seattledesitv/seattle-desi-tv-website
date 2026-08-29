import "server-only";

import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import type { SiteConfig, SiteSettings, SiteStatus } from "./types";

type SiteRow = {
  id: string;
  code: string;
  slug: string;
  name: string;
  short_name: string;
  city: string;
  state_code: string;
  timezone: string;
  status: SiteStatus;
  settings: SiteSettings | null;
};

type DomainRow = {
  hostname: string;
  is_primary: boolean;
  redirect_to_primary: boolean;
  environment: string;
  site: SiteRow | SiteRow[] | null;
};

const FALLBACK_SITE: Omit<SiteConfig, "hostname"> = {
  id: null,
  code: "sea",
  slug: "seattle",
  name: "Seattle Desi TV",
  shortName: "SDTV",
  city: "Seattle",
  stateCode: "WA",
  timezone: "America/Los_Angeles",
  status: "active",
  settings: {
    contact_email: "info@seattledesitv.com",
    whatsapp_number: "+14254397388",
  },
  primaryHostname: "seattledesitv.com",
  source: "fallback",
};

function normalizedHostname(value: string | null) {
  const candidate = String(value || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (!candidate) return "unknown";
  try {
    return new URL(`http://${candidate}`).hostname.toLowerCase();
  } catch {
    return candidate.replace(/:\d+$/, "") || "unknown";
  }
}

function configuredClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function firstSite(value: DomainRow["site"]) {
  return Array.isArray(value) ? value[0] || null : value;
}

function configFromRow(
  site: SiteRow,
  hostname: string,
  primaryHostname: string,
  source: SiteConfig["source"],
): SiteConfig {
  return {
    id: site.id,
    code: site.code,
    slug: site.slug,
    name: site.name,
    shortName: site.short_name,
    city: site.city,
    stateCode: site.state_code,
    timezone: site.timezone,
    status: site.status,
    settings: site.settings || {},
    hostname,
    primaryHostname,
    source,
  };
}

async function primaryHostname(
  db: NonNullable<ReturnType<typeof configuredClient>>,
  siteId: string,
) {
  const { data } = await db
    .from("site_domains")
    .select("hostname")
    .eq("site_id", siteId)
    .eq("environment", "production")
    .eq("active", true)
    .eq("is_primary", true)
    .maybeSingle();
  const hostname = data?.hostname;
  return typeof hostname === "string" ? hostname : null;
}

export async function resolveSiteForHostname(hostnameValue: string | null) {
  const hostname = normalizedHostname(hostnameValue);
  const db = configuredClient();
  if (!db) return { ...FALLBACK_SITE, hostname } satisfies SiteConfig;

  try {
    const { data: domain } = await db
      .from("site_domains")
      .select("hostname,is_primary,redirect_to_primary,environment,site:sites(id,code,slug,name,short_name,city,state_code,timezone,status,settings)")
      .eq("hostname", hostname)
      .eq("active", true)
      .maybeSingle();
    const domainRow = domain as DomainRow | null;
    const domainSite = firstSite(domainRow?.site || null);
    if (domainRow && domainSite) {
      const primary = domainRow.is_primary
        ? domainRow.hostname
        : (await primaryHostname(db, domainSite.id)) || domainRow.hostname;
      return configFromRow(domainSite, hostname, primary, "domain");
    }

    const defaultCode = (process.env.DEFAULT_SITE_CODE || "sea").trim().toLowerCase();
    const { data: defaultSite } = await db
      .from("sites")
      .select("id,code,slug,name,short_name,city,state_code,timezone,status,settings")
      .eq("code", defaultCode)
      .in("status", ["planned", "active"])
      .maybeSingle();
    if (defaultSite) {
      const primary = (await primaryHostname(db, defaultSite.id)) || FALLBACK_SITE.primaryHostname;
      return configFromRow(defaultSite as SiteRow, hostname, primary, "default");
    }
  } catch {
    // A site-registry outage must not take down the existing Seattle website.
  }

  return { ...FALLBACK_SITE, hostname } satisfies SiteConfig;
}

export async function resolveCurrentSite() {
  const requestHeaders = await headers();
  return resolveSiteForHostname(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host"),
  );
}

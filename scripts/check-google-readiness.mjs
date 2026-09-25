const baseUrl = String(process.env.READINESS_BASE_URL || process.argv[2] || "https://www.seattledesitv.com").replace(/\/$/, "");

const criticalRoutes = [
  "/",
  "/about",
  "/events",
  "/businesses",
  "/community-organizations",
  "/team",
  "/radio",
  "/contact",
  "/subscribe",
  "/community-disclaimer",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
];

const placeholderPatterns = [
  /coming soon/i,
  /under construction/i,
  /loading approved events/i,
  /loading approved businesses/i,
  /loading team/i,
  /loading radio hosts/i,
  /no upcoming approved events yet/i,
  /no approved businesses yet/i,
  /loading latest videos/i,
];

async function fetchPage(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "follow",
    headers: { "user-agent": "SDTV-Google-Readiness-Audit/1.0" },
  });
  return { path, response, body: await response.text() };
}

const results = await Promise.allSettled(criticalRoutes.map(fetchPage));
const failures = [];
const warnings = [];
const pageBodies = new Map();

for (let index = 0; index < results.length; index += 1) {
  const result = results[index];
  const path = criticalRoutes[index];
  if (result.status === "rejected") {
    failures.push(`${path}: request failed (${result.reason?.message || result.reason})`);
    continue;
  }
  const { response, body } = result.value;
  pageBodies.set(path, body);
  if (!response.ok) failures.push(`${path}: HTTP ${response.status}`);
  if (!body.trim()) failures.push(`${path}: empty response`);
  if (response.ok && path !== "/robots.txt" && path !== "/sitemap.xml" && path !== "/llms.txt") {
    const visibleHtml = body
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
    for (const pattern of placeholderPatterns) {
      if (pattern.test(visibleHtml)) warnings.push(`${path}: contains visible placeholder text matching ${pattern}`);
    }
  }
}

const formContracts = [
  {
    path: "/contact",
    markers: [
      ['id="contact-form"', "contact form"],
      ['name="name"', "name field"],
      ['name="email"', "email field"],
      ['name="message"', "message field"],
      ["Submit Contact Request", "submit button"],
    ],
  },
  {
    path: "/subscribe",
    markers: [
      ['type="email"', "email field"],
      ["Subscribe", "subscribe button"],
      ["Unsubscribe anytime", "unsubscribe notice"],
    ],
  },
];

for (const contract of formContracts) {
  const body = pageBodies.get(contract.path) || "";
  for (const [marker, label] of contract.markers) {
    if (!body.includes(marker)) failures.push(`${contract.path}: missing ${label}`);
  }
}

const publicHtml = [...pageBodies.entries()]
  .filter(([path]) => !path.endsWith(".txt") && !path.endsWith(".xml"))
  .map(([, body]) => body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " "))
  .join("\n");
const internalPaths = new Set();
for (const match of publicHtml.matchAll(/\bhref=["']([^"']+)["']/gi)) {
  const href = match[1].replaceAll("&amp;", "&");
  if (!href.startsWith("/") || href.startsWith("//")) continue;
  const url = new URL(href, baseUrl);
  if (url.origin !== new URL(baseUrl).origin || url.pathname.startsWith("/api/")) continue;
  internalPaths.add(`${url.pathname}${url.search}`);
}

const internalResults = await Promise.allSettled([...internalPaths].map(fetchPage));
for (let index = 0; index < internalResults.length; index += 1) {
  const result = internalResults[index];
  const path = [...internalPaths][index];
  if (result.status === "rejected") failures.push(`${path}: internal link request failed`);
  else if (!result.value.response.ok) failures.push(`${path}: internal link returned HTTP ${result.value.response.status}`);
}

const sitemap = results[criticalRoutes.indexOf("/sitemap.xml")];
if (sitemap?.status === "fulfilled") {
  for (const path of ["/about", "/events", "/businesses", "/contact", "/community-disclaimer"]) {
    if (!sitemap.value.body.includes(path)) failures.push(`/sitemap.xml: missing ${path}`);
  }
}

const robots = results[criticalRoutes.indexOf("/robots.txt")];
if (robots?.status === "fulfilled" && !/sitemap:/i.test(robots.value.body)) {
  failures.push("/robots.txt: sitemap declaration is missing");
}

console.log(`Google readiness audit: ${baseUrl}`);
for (const warning of warnings) console.warn(`WARNING ${warning}`);
for (const failure of failures) console.error(`ERROR ${failure}`);
console.log(`${criticalRoutes.length} critical routes and ${internalPaths.size} visible internal links checked; ${warnings.length} warning(s); ${failures.length} error(s).`);

if (failures.length) process.exitCode = 1;

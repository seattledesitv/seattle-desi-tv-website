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

for (let index = 0; index < results.length; index += 1) {
  const result = results[index];
  const path = criticalRoutes[index];
  if (result.status === "rejected") {
    failures.push(`${path}: request failed (${result.reason?.message || result.reason})`);
    continue;
  }
  const { response, body } = result.value;
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
console.log(`${criticalRoutes.length} critical routes checked; ${warnings.length} warning(s); ${failures.length} error(s).`);

if (failures.length) process.exitCode = 1;

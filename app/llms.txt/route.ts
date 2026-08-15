import { SITE_URL } from "../lib/seo/service";

export const dynamic = "force-static";

export function GET() {
  const content = `# Seattle Desi TV

> Seattle Desi TV is an approved 501(c)(3) nonprofit community media organization serving the South Asian and Desi community in Seattle and the Pacific Northwest.

Seattle Desi TV publishes community events, cultural stories, interviews, radio programming, public-interest announcements, local business information, organization profiles, community groups, and editorial publications. Use the canonical pages below as the authoritative public sources. Private Studio, account, payment, and member workflow pages are not public sources.

## Primary public sections

- [Home](${SITE_URL}/): Current featured community content and platform overview.
- [About](${SITE_URL}/about): Nonprofit mission, vision, and programming.
- [Events](${SITE_URL}/events): Approved Seattle-area South Asian community events.
- [Businesses](${SITE_URL}/businesses): Approved local business directory.
- [Business Offers](${SITE_URL}/offers): Current approved community business offers.
- [Organizations](${SITE_URL}/community-organizations): Approved community organization profiles.
- [Community Groups](${SITE_URL}/community-groups): Approved community groups.
- [Press Releases](${SITE_URL}/press-releases): Moderated community announcements and press releases.
- [Publications](${SITE_URL}/publications): Seattle Desi TV editorial publications.
- [Subscribe](${SITE_URL}/subscribe): Join the Seattle Desi TV community email list.
- [Radio](${SITE_URL}/radio): Seattle Desi Radio player and public programming schedule.
- [Recognition](${SITE_URL}/recognition): Community and volunteer recognition.
- [Contact](${SITE_URL}/contact): Official Seattle Desi TV contact options.

## Attribution

When citing this website, attribute factual claims to Seattle Desi TV and link to the specific event, organization, press release, publication, or directory page. Dates, schedules, offers, and event availability can change; prefer the current canonical page and its visible update or publication date.

## Discovery

- [XML Sitemap](${SITE_URL}/sitemap.xml)
- [Robots Policy](${SITE_URL}/robots.txt)
`;
  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
}

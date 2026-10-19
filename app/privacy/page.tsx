import LegalPageLayout from "../components/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains how Seattle Desi TV may collect, use, store, and protect information when people use our website, the Seattle Desi Radio mobile app, accounts, submissions, listings, media, and community services."
      updated="October 19, 2026"
      sections={[
        {
          title: "Information we may collect",
          paragraphs: ["We may collect information that you provide directly and limited technical information generated when you use the platform."],
          bullets: [
            "Name, email address, phone number, account and profile details.",
            "Volunteer, team, influencer, business, organization, event, contributor, and coverage information.",
            "Photos, logos, flyers, videos, documents, messages, forms, and other submitted content.",
            "Authentication, device, browser, usage, security, network-request, and diagnostic information.",
          ],
        },
        {
          title: "How information may be used",
          bullets: [
            "To operate accounts, My Hub, Studio, listings, submissions, assignments, and community workflows.",
            "To provide the Seattle Desi Radio stream, schedules, events, social-content listings, links, and related app functions.",
            "To review, approve, publish, edit, organize, or respond to submitted information and media.",
            "To communicate about events, coverage, volunteering, newsletters, services, support, and platform changes.",
            "To protect the platform, investigate misuse, enforce policies, and comply with legal obligations.",
            "To improve the website, mobile app, user experience, reliability, accessibility, and community services.",
          ],
        },
        {
          title: "Seattle Desi Radio mobile app",
          paragraphs: [
            "This section applies to the custom Seattle Desi Radio mobile app operated by Seattle Desi TV. It does not describe the app as a Live365-owned mobile application.",
            "The app provides live radio, program schedules, community events, social-content listings, and links to Seattle Desi TV websites and contact channels. Native listening and browsing do not require a Seattle Desi TV account.",
            "To provide this content, the app makes network requests to Seattle Desi TV systems, Live365, and services that host images or other media. Those services receive technical request information ordinarily needed to deliver content, such as an IP address, request time, requested resource, user-agent or device/browser information, and diagnostic information.",
          ],
        },
        {
          title: "Live365 streaming, measurement, and advertisements",
          paragraphs: [
            "Live365 provides the radio stream and related streaming infrastructure. Live365's listener-analytics documentation explains that unique listeners are distinguished using IP-address and user-agent information and that listening sessions may include region, platform, device, and session-length information.",
            "Live365 may insert audio advertisements into the stream. Live365 states that advertisements are supplied through an advertising partner and may vary by a listener's geolocation, including city, state, or region. Approximate location inferred from an IP address is different from the app requesting or accessing a device's precise GPS location. The Seattle Desi Radio app does not need precise GPS location for native listening or browsing.",
            "Seattle Desi TV does not set or control Live365's independent data-retention periods, advertising-partner practices, or deletion procedures. Live365's public analytics and advertising documentation confirms collection and use for these functions but does not state a fixed listener-data retention period or a listener deletion process. Please review Live365's current privacy policy and contact Live365 for requests concerning information controlled solely by Live365.",
          ],
          links: [
            { label: "Live365 privacy policy", href: "https://live365.com/legal/privacy" },
            { label: "Live365 listener analytics and statistics", href: "https://help.live365.com/en/support/solutions/articles/43000533258-your-listener-analytics-and-statistics" },
            { label: "How Live365 ad insertion works", href: "https://help.live365.com/en/support/solutions/articles/43000573916-how-does-the-live365-ad-insertion-work-" },
          ],
        },
        {
          title: "Public information",
          paragraphs: ["Information submitted for public profiles, listings, events, contributor recognition, team pages, interviews, or media coverage may be displayed publicly after review. Do not submit confidential information for public publication."],
        },
        {
          title: "Matrimony privacy",
          paragraphs: ["Matrimony information is sensitive and is handled through a restricted, moderated service. Approved profile details and photos are available only to the profile owner, authorized administrators, and authenticated users with current approved access. Private contact details are not disclosed to profile viewers and remain limited to the profile owner and authorized administrators."],
          bullets: [
            "Profile owners control what they submit and must confirm consent before review.",
            "Every profile and viewer-access request is reviewed before approval.",
            "Payment does not guarantee a match, response, introduction, or outcome.",
            "Access may be suspended or revoked for misuse, sharing, harassment, scraping, or safety concerns.",
          ],
        },
        {
          title: "Service providers and sharing",
          paragraphs: [
            "Seattle Desi TV may use trusted hosting, database, authentication, email, analytics, storage, media, streaming, advertising, and operational service providers. Information may be shared with them only as reasonably needed to operate the website, app, and related services. For app listening, this includes sending requests to Live365 so it can deliver the stream, measure listening, and insert audio advertising as described above.",
            "We may also disclose information when required by law, to protect safety or rights, or during an organizational transition. Third-party providers may process technical information under their own terms and privacy policies.",
          ],
        },
        {
          title: "Cookies and similar technologies",
          paragraphs: ["The website may use cookies, local storage, authentication tokens, analytics, and similar technologies to keep users signed in, remember preferences, maintain security, measure performance, and improve services. Browser settings may allow you to restrict some of these technologies, although portions of the platform may then stop working correctly. Native app listening and browsing do not require a Seattle Desi TV account, but network providers may still receive the technical request information described in this policy."],
        },
        {
          title: "Data retention, deletion, and security",
          paragraphs: [
            "Seattle Desi TV may retain information it controls for as long as reasonably necessary for operations, records, safety, legal compliance, dispute handling, and legitimate community purposes. Website and API hosting providers may create technical request and security logs and retain them according to the provider configuration and applicable provider terms; this policy does not promise a fixed log-retention period where Seattle Desi TV has not established one.",
            "Live365 controls the listener and streaming information held in its systems. Seattle Desi TV cannot guarantee deletion of information controlled solely by Live365 or another external provider. Privacy and deletion requests will be reviewed to identify the systems involved and will be handled or directed to the relevant provider, subject to applicable law and legitimate legal, security, archival, and operational requirements.",
            "We use reasonable administrative and technical safeguards for information under our control, but no internet, mobile, or streaming service can guarantee absolute security.",
          ],
        },
        {
          title: "Your choices and privacy requests",
          paragraphs: [
            "To request access, correction, or deletion of personal information that Seattle Desi TV controls, email info@seattledesitv.com with the subject “Privacy Request.” Describe the service involved, the information or account concerned, and the action requested. We may need to verify your identity and authority before acting. If the information is controlled by Live365 or another third party, we may direct you to that provider.",
          ],
          bullets: [
            "You may request corrections to personal information or public listings.",
            "You may unsubscribe from non-essential communications using available controls.",
            "You may request account or profile review, subject to legal, operational, archival, and safety requirements.",
            "Business and organization owners may use available claim and management processes for eligible listings.",
          ],
        },
        {
          title: "External destinations and submissions",
          paragraphs: [
            "The app and website may link to Seattle Desi TV web pages, YouTube, Instagram, social platforms, maps, forms, payment tools, video services, or other external destinations. When you leave the app or website, the destination service's privacy practices apply.",
            "Information you voluntarily submit through a Seattle Desi TV website form or contact channel is handled under the relevant sections of this policy, including the sections covering information collection, use, public information, service providers, retention, security, and privacy requests.",
          ],
        },
        {
          title: "Children and youth",
          paragraphs: ["Youth participation may require parent, guardian, school, organization, or program authorization depending on the activity. Users should not submit a minor's sensitive personal information without appropriate authority and consent."],
        },
        {
          title: "Changes to this policy",
          paragraphs: ["We may update this policy as the website, mobile app, services, providers, or legal requirements change. The updated date shown on this page indicates the latest revision."],
        },
      ]}
    />
  );
}

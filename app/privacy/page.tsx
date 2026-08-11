import LegalPageLayout from "../components/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy explains how Seattle Desi TV may collect, use, store, and protect information when people use our website, accounts, submissions, listings, media, and community services."
      updated="August 10, 2026"
      sections={[
        {
          title: "Information we may collect",
          paragraphs: ["We may collect information that you provide directly and limited technical information generated when you use the platform."],
          bullets: [
            "Name, email address, phone number, account and profile details.",
            "Volunteer, team, influencer, business, organization, event, contributor, and coverage information.",
            "Photos, logos, flyers, videos, documents, messages, forms, and other submitted content.",
            "Authentication, device, browser, usage, security, and diagnostic information.",
          ],
        },
        {
          title: "How information may be used",
          bullets: [
            "To operate accounts, My Hub, Studio, listings, submissions, assignments, and community workflows.",
            "To review, approve, publish, edit, organize, or respond to submitted information and media.",
            "To communicate about events, coverage, volunteering, newsletters, services, support, and platform changes.",
            "To protect the platform, investigate misuse, enforce policies, and comply with legal obligations.",
            "To improve the website, user experience, reliability, accessibility, and community services.",
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
          paragraphs: ["Seattle Desi TV may use trusted hosting, database, authentication, email, analytics, storage, media, and operational service providers. Information may be shared with them only as reasonably needed to operate the platform. We may also disclose information when required by law, to protect safety or rights, or during an organizational transition."],
        },
        {
          title: "Cookies and similar technologies",
          paragraphs: ["The platform may use cookies, local storage, authentication tokens, analytics, and similar technologies to keep users signed in, remember preferences, maintain security, measure performance, and improve services. Browser settings may allow you to restrict some of these technologies, although portions of the platform may then stop working correctly."],
        },
        {
          title: "Data retention and security",
          paragraphs: ["We may retain information for as long as reasonably necessary for operations, records, safety, legal compliance, dispute handling, and legitimate community purposes. We use reasonable administrative and technical safeguards, but no internet service can guarantee absolute security."],
        },
        {
          title: "Your choices",
          bullets: [
            "You may request corrections to personal information or public listings.",
            "You may unsubscribe from non-essential communications using available controls.",
            "You may request account or profile review, subject to legal, operational, archival, and safety requirements.",
            "Business and organization owners may use available claim and management processes for eligible listings.",
          ],
        },
        {
          title: "Children and youth",
          paragraphs: ["Youth participation may require parent, guardian, school, organization, or program authorization depending on the activity. Users should not submit a minor's sensitive personal information without appropriate authority and consent."],
        },
        {
          title: "Third-party services",
          paragraphs: ["The website may link to or embed third-party services, social platforms, maps, forms, payment tools, video services, or external websites. Their privacy practices are governed by their own policies, not this policy."],
        },
        {
          title: "Changes to this policy",
          paragraphs: ["We may update this policy as the platform, services, or legal requirements change. The updated date shown on this page indicates the latest revision."],
        },
      ]}
    />
  );
}

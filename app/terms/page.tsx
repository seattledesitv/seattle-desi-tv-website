import LegalPageLayout from "../components/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms & Conditions"
      summary="These terms govern access to and use of the Seattle Desi TV website, accounts, listings, submissions, media, community tools, and related services."
      updated="August 10, 2026"
      sections={[
        {
          title: "Acceptance of terms",
          paragraphs: ["By accessing or using this website, creating an account, submitting information, or using any Seattle Desi TV service, you agree to these terms and the applicable Privacy Policy and Content Usage Policy. If you do not agree, do not use the platform."],
        },
        {
          title: "Community platform purpose",
          paragraphs: ["Seattle Desi TV provides community media, cultural, event, radio, business, organization, volunteer, contributor, and related platform services. Features may change, be suspended, or be discontinued at any time."],
        },
        {
          title: "Accounts and responsibilities",
          bullets: [
            "Provide accurate, current, and complete information.",
            "Keep login credentials secure and do not share restricted access.",
            "Use only accounts and roles you are authorized to use.",
            "Promptly report suspected unauthorized access or inaccurate information.",
            "You are responsible for activity performed through your account, subject to applicable law.",
          ],
        },
        {
          title: "Submissions and permissions",
          paragraphs: ["When you submit text, images, logos, flyers, videos, audio, documents, profile information, listings, or other content, you represent that you have the necessary rights, permissions, releases, and authority to submit and authorize its use for the requested platform purpose."],
          bullets: [
            "Do not submit content that infringes copyright, trademark, privacy, publicity, contractual, or other rights.",
            "Do not submit unlawful, deceptive, defamatory, threatening, hateful, harassing, unsafe, or malicious material.",
            "Seattle Desi TV may review, edit for presentation, reject, remove, archive, or disable submitted material.",
          ],
        },
        {
          title: "Events, listings, and community information",
          paragraphs: ["Event, business, organization, contributor, influencer, volunteer, and other community information may be supplied by third parties. Seattle Desi TV may review submissions but does not guarantee that every detail is complete, current, accurate, available, safe, endorsed, or suitable for a particular purpose. Users should independently verify important information."],
        },
        {
          title: "Matrimony service",
          paragraphs: ["The matrimony service is a moderated profile-access service, not a matchmaking guarantee, background-check service, dating agency, legal adviser, or endorsement of any person. Users are responsible for their own decisions, communications, meetings, identity verification, and personal safety."],
          bullets: [
            "Only adults may submit a profile or request profile access.",
            "Users must provide truthful information and have authority and consent for every submitted detail and image.",
            "Restricted profiles, images, and information may not be copied, downloaded, redistributed, scraped, published, or used for solicitation.",
            "Seattle Desi TV may deny, suspend, expire, or revoke access to protect privacy, safety, or platform integrity.",
            "Fees purchase time-limited access only and do not guarantee contact, an introduction, compatibility, or any result.",
          ],
        },
        {
          title: "Prohibited conduct",
          bullets: [
            "Attempting to gain unauthorized access to accounts, data, systems, or administrative tools.",
            "Scraping, copying, harvesting, probing, disrupting, overloading, or reverse engineering the platform except where law expressly permits it.",
            "Impersonating another person or organization, submitting false claims, or misrepresenting authority.",
            "Uploading malware, harmful code, spam, fraudulent promotions, or unlawful material.",
            "Using Seattle Desi TV names, logos, media, data, or services in a way that falsely suggests endorsement or partnership.",
          ],
        },
        {
          title: "Moderation and access",
          paragraphs: ["Seattle Desi TV may investigate reports, moderate content, correct records, restrict features, suspend or terminate access, revoke roles, or remove material when reasonably necessary to protect users, the community, the platform, legal rights, safety, or operational integrity."],
        },
        {
          title: "Third-party links and services",
          paragraphs: ["Links, embeds, advertisements, offers, payment services, maps, forms, social platforms, and external websites are provided for convenience. Seattle Desi TV does not control and is not responsible for third-party availability, content, security, products, services, promises, or practices."],
        },
        {
          title: "No warranties",
          paragraphs: ["To the fullest extent permitted by law, the platform and its content are provided on an “as is” and “as available” basis. Seattle Desi TV does not guarantee uninterrupted operation, error-free content, specific results, or the accuracy or availability of third-party information."],
        },
        {
          title: "Limitation of liability",
          paragraphs: ["To the fullest extent permitted by law, Seattle Desi TV and its volunteers, team members, contributors, representatives, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, loss of data, revenue, opportunity, reputation, or use arising from the platform or third-party services."],
        },
        {
          title: "Indemnity",
          paragraphs: ["To the extent permitted by law, you agree to defend, indemnify, and hold harmless Seattle Desi TV and its representatives from claims, losses, liabilities, and reasonable costs arising from your unlawful use, submitted content, rights violations, misrepresentation, or breach of these terms."],
        },
        {
          title: "Governing law",
          paragraphs: ["These terms are governed by the laws of the State of Washington, United States, without regard to conflict-of-law principles, except where applicable law requires otherwise. Any dispute must be brought in a court with appropriate jurisdiction in Washington State unless the parties agree to another lawful process."],
        },
        {
          title: "Changes and severability",
          paragraphs: ["We may update these terms as the platform evolves. Continued use after an update constitutes acceptance of the revised terms. If any provision is found unenforceable, the remaining provisions will continue to apply."],
        },
      ]}
    />
  );
}

import LegalPageLayout from "../components/LegalPageLayout";

export default function ContentPolicyPage() {
  return (
    <LegalPageLayout
      eyebrow="Copyright & Media"
      title="Content Usage Policy"
      summary="This policy explains ownership, permitted sharing, prohibited reuse, submission permissions, and copyright reporting for Seattle Desi TV content and community media."
      updated="July 26, 2026"
      sections={[
        {
          title: "Seattle Desi TV content",
          paragraphs: ["Unless expressly stated otherwise, original videos, interviews, event coverage, photographs, audio, radio programs, articles, graphics, designs, captions, compilations, website copy, branding, and other media created by or for Seattle Desi TV are owned by Seattle Desi TV or used under licence."],
        },
        {
          title: "Permitted sharing",
          bullets: [
            "Share links to official Seattle Desi TV website, YouTube, social, radio, and other published pages.",
            "Use official platform sharing controls.",
            "Embed an official Seattle Desi TV video where the platform permits embedding and the original player, attribution, branding, and link remain intact.",
            "Share an official post without altering its meaning, ownership notices, credits, watermark, or branding.",
          ],
        },
        {
          title: "Permission required",
          paragraphs: ["Written permission is required before using Seattle Desi TV content beyond the permitted sharing described above."],
          bullets: [
            "Downloading and re-uploading videos, photographs, audio, interviews, articles, graphics, or clips.",
            "Commercial use, advertising use, sponsorship use, resale, licensing, syndication, paid distribution, or monetization.",
            "Editing, translating, dubbing, clipping, remixing, compiling, or creating derivative works for republication.",
            "Using content in broadcasts, films, publications, presentations, campaigns, training, or promotional materials.",
            "Using Seattle Desi TV names, logos, marks, graphics, or media in a way that suggests endorsement, partnership, or official status.",
          ],
        },
        {
          title: "Prohibited treatment of content",
          bullets: [
            "Do not remove, crop, obscure, replace, or alter Seattle Desi TV branding, credits, watermarks, captions, or copyright notices.",
            "Do not present Seattle Desi TV content as your own or attribute it to another source.",
            "Do not edit interviews or coverage in a misleading, defamatory, deceptive, harmful, or materially out-of-context manner.",
            "Do not use content for unlawful purposes or to harass, exploit, impersonate, or misrepresent a person or organization.",
          ],
        },
        {
          title: "Event coverage",
          paragraphs: ["Seattle Desi TV generally retains ownership of the media it creates while covering an event, even when access, coordination, sponsorship, or other support is provided by an organizer. Organizers may share links to official published coverage and official posts with attribution. Downloading, editing, re-uploading, commercial redistribution, or providing footage to third parties requires written permission unless a separate written agreement states otherwise."],
        },
        {
          title: "Interviews and appearances",
          paragraphs: ["By knowingly participating in a recorded interview, program, performance, public event, or approved media activity, participants authorize Seattle Desi TV to record, edit for legitimate editorial and production purposes, publish, promote, archive, and distribute the resulting coverage, subject to any separate written agreement and applicable law."],
        },
        {
          title: "Submitted content",
          paragraphs: ["You retain ownership of content you lawfully own. By submitting content to Seattle Desi TV, you grant Seattle Desi TV a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, adapt for formatting, review, edit for presentation, publish, display, promote, archive, and distribute that content for platform, editorial, community, promotional, and operational purposes connected to the submission."],
          bullets: [
            "You confirm that you own the content or have all required permissions and releases.",
            "You confirm that publication will not violate copyright, trademark, privacy, publicity, contractual, or other rights.",
            "You remain responsible for claims arising from content you submit without proper authority.",
          ],
        },
        {
          title: "Businesses, organizations, and contributors",
          paragraphs: ["Business owners, organizations, event organizers, contributors, and community members retain rights in their names, logos, trademarks, and submitted materials. By providing those materials for a listing, contribution, event, promotion, or profile, they authorize Seattle Desi TV to display and use them for the relevant platform and community purpose."],
        },
        {
          title: "Third-party content",
          paragraphs: ["Some content may belong to event organizers, businesses, organizations, performers, photographers, licensors, social platforms, or other third parties. Their content remains subject to their rights and applicable permissions. The appearance of third-party material does not transfer ownership to Seattle Desi TV or to website users."],
        },
        {
          title: "Copyright and rights notices",
          paragraphs: ["A rights notice should identify the work, the location of the material, the rights owner, contact information, the basis of the concern, and a statement that the report is accurate and made in good faith. Seattle Desi TV may request additional information, restrict material during review, forward the notice to the submitting party, and take appropriate action."],
        },
        {
          title: "No implied licence",
          paragraphs: ["Except for the limited sharing expressly allowed in this policy, access to the website or viewing Seattle Desi TV content does not grant any licence or permission to copy, download, republish, modify, distribute, perform, display, sell, or commercially exploit the content."],
        },
      ]}
    />
  );
}

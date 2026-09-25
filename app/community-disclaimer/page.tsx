import LegalPageLayout from "../components/LegalPageLayout";

export default function CommunityDisclaimerPage() {
  return (
    <LegalPageLayout
      eyebrow="Nonprofit & community notice"
      title="Community Purpose & No-Endorsement Disclaimer"
      summary="Seattle Desi TV is a 501(c)(3) nonprofit community media organization. This notice explains the community purpose of the platform and what publication or inclusion on the platform does—and does not—mean."
      updated="September 25, 2026"
      sections={[
        {
          title: "Nonprofit community purpose",
          paragraphs: [
            "Seattle Desi TV is a nonprofit organization recognized as tax-exempt under Section 501(c)(3) of the Internal Revenue Code. The platform is operated to support community, cultural, educational, charitable, and public-information purposes. Its programs are intended to connect and inform the community—not to provide private commercial benefit as their primary purpose.",
          ],
        },
        {
          title: "No implied endorsement",
          paragraphs: [
            "The publication, listing, mention, interview, profile, image, link, event coverage, award, recognition, review, press release, classified, offer, sponsorship, or other appearance of a business, organization, event, individual, product, or service does not by itself constitute an endorsement, recommendation, certification, guarantee, partnership, or advocacy by Seattle Desi TV.",
            "Any use of Seattle Desi TV's name, logo, content, or platform by a third party must not falsely imply endorsement, approval, sponsorship, or partnership.",
          ],
        },
        {
          title: "Advertising, sponsorships, and contributed support",
          paragraphs: [
            "Seattle Desi TV may acknowledge donors and contributors and may offer advertising, sponsorship, featured placement, or promotional opportunities that support its nonprofit work. Paid or sponsored material should be identified through labels or the surrounding context. Payment or support does not constitute a guarantee of quality, safety, suitability, availability, or results, and does not permit a sponsor or advertiser to control Seattle Desi TV's independent community or editorial judgment.",
          ],
        },
        {
          title: "Third-party and community-submitted information",
          paragraphs: [
            "Businesses, organizations, event organizers, contributors, users, and other third parties may submit information appearing on the platform. Although Seattle Desi TV may moderate or review submissions, it does not independently verify every statement and does not guarantee that every listing, price, offer, credential, date, location, claim, product, service, or external link is accurate, complete, current, lawful, safe, or suitable.",
            "Visitors are responsible for independently verifying important information and for their own communications, purchases, attendance, participation, donations, contracts, safety decisions, and dealings with third parties.",
          ],
        },
        {
          title: "Nonpartisan status",
          paragraphs: [
            "Seattle Desi TV does not endorse or oppose candidates for public office or political parties. Community education, public-information content, issue discussions, or the appearance of a public official does not by itself constitute political endorsement. Views expressed by guests, contributors, users, volunteers, or third parties are their own unless Seattle Desi TV expressly states otherwise through an authorized organizational communication.",
          ],
        },
        {
          title: "No professional advice or warranties",
          paragraphs: [
            "Content on the platform is provided for general community and informational purposes and is not legal, financial, medical, tax, safety, or other professional advice. To the fullest extent permitted by law, the platform and third-party information are provided on an “as is” and “as available” basis, subject to the Terms & Conditions.",
          ],
        },
        {
          title: "Relationship to other policies",
          paragraphs: [
            "This disclaimer supplements the Seattle Desi TV Terms & Conditions, Privacy Policy, and Content Usage Policy. If you submit content, create an account, purchase a service, or use a specialized platform feature, additional terms and notices may also apply.",
          ],
        },
      ]}
    />
  );
}

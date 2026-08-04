export const DEFAULT_SPONSORSHIP_AGREEMENT = `SEATTLE DESI TV SPONSORSHIP AGREEMENT

This Sponsorship Agreement is between Seattle Desi TV ("SDTV"), a nonprofit 501(c)(3) community organization, and {{SPONSOR_NAME}} ("Sponsor").

TERM
The sponsorship begins {{START_DATE}} and ends {{END_DATE}}.

SPONSORSHIP PACKAGE
Sponsor selects the {{PACKAGE_NAME}} package. SDTV will provide the following benefits during the agreement term:
{{BENEFITS}}

PAYMENT
The standard package amount is {{BASE_AMOUNT}}. After the approved discount of {{DISCOUNT}}, the final agreement amount is {{FINAL_AMOUNT}}. Sponsor will pay according to the installment schedule displayed with this agreement. Zelle payments must be sent to info@seattledesitv.com and accompanied by payment confirmation.

CONTENT AND BRAND MATERIALS
Sponsor will provide accurate brand assets and timely approvals. SDTV may adapt supplied materials to fit its channels while preserving the Sponsor's brand. Two reasonable edit rounds are included for custom promotional content unless otherwise agreed in writing.

SCHEDULING AND PERFORMANCE
SDTV will make commercially reasonable efforts to deliver the listed benefits. Dates may be adjusted by mutual agreement for production, event, platform, or community needs. Specific audience reach or business results are not guaranteed.

CANCELLATION
Once accepted, scheduled payments remain due unless SDTV agrees otherwise in writing. If SDTV cannot deliver a material benefit, the parties will first agree on a comparable replacement benefit.

APPROVAL
Electronic acceptance confirms that the signer is authorized to accept this agreement for the Sponsor and agrees to the terms, package benefits, dates, final amount, and payment schedule shown above.`;

export function fillAgreementTemplate(
  template: string,
  values: Record<string, string>,
) {
  return Object.entries(values).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    template || DEFAULT_SPONSORSHIP_AGREEMENT,
  );
}

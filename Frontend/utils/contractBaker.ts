export type SecondPartyData = {
  companyName?: string;
  managerName?: string;
  crNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  emirate?: string;
  country?: string;
};

export type SignatureData = {
  signedName?: string;
  email?: string;
  phone?: string;
  address?: string;
  date?: string;
};

export function bakeContractTemplate(
  templateText: string,
  lang: string,
  firstPartyConfig: Record<string, string> = {},
  secondParty: SecondPartyData = {},
  signature: SignatureData = {},
): string {
  if (!templateText) return '';
  let text = templateText;

  const fp = firstPartyConfig || {};
  text = text.replace(/{{FIRST_PARTY_NAME_AR}}/g, fp.companyNameAr || '');
  text = text.replace(/{{FIRST_PARTY_NAME_EN}}/g, fp.companyNameEn || '');
  text = text.replace(/{{FIRST_PARTY_CR}}/g, fp.crNumber || '');
  text = text.replace(/{{FIRST_PARTY_LICENSE}}/g, fp.licenseNumber || '');
  text = text.replace(/{{FIRST_PARTY_EXPIRY}}/g, fp.licenseExpiry || '');
  text = text.replace(/{{FIRST_PARTY_HQ_AR}}/g, fp.headquartersAr || '');
  text = text.replace(/{{FIRST_PARTY_HQ_EN}}/g, fp.headquartersEn || '');

  text = text.replace(/{{CUSTOMER_COMPANY_NAME}}/g, secondParty.companyName || '___________');
  text = text.replace(/{{CUSTOMER_CR}}/g, secondParty.crNumber || '___________');
  text = text.replace(/{{CUSTOMER_LICENSE}}/g, secondParty.licenseNumber || '___________');
  text = text.replace(/{{CUSTOMER_EXPIRY}}/g, secondParty.licenseExpiry || '___________');
  text = text.replace(/{{CUSTOMER_NAME}}/g, secondParty.managerName || '___________');
  text = text.replace(/{{CUSTOMER_EMIRATE}}/g, secondParty.emirate || '___________');
  text = text.replace(/{{CUSTOMER_COUNTRY}}/g, secondParty.country || '___________');
  text = text.replace(/{{CUSTOMER_PHONE}}/g, signature.phone || '___________');
  text = text.replace(/{{CUSTOMER_EMAIL}}/g, signature.email || '___________');
  text = text.replace(/{{CUSTOMER_ADDRESS}}/g, signature.address || '___________');
  text = text.replace(
    /{{CURRENT_DATE}}/g,
    new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US'),
  );

  return text;
}

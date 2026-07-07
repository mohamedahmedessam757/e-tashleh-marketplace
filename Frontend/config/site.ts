import { fetchPublicConfig } from '../hooks/usePublicConfig';

const DEFAULTS = {
  contact: 'shop@e-tashleh.shop',
  customer: 'cs@e-tashleh.shop',
  merchant: 'sl@e-tashleh.shop',
  wholesale: 'wh@e-tashleh.shop',
  company: 'shop@e-tashleh.shop',
  whatsapp: '971544404839',
  platformName: 'E-Tashleh',
  logoUrl: '/logo.png',
};

/** Mutable site contacts — call `hydrateSiteConfig()` on app boot. */
export const siteContacts = { ...DEFAULTS };

/** @deprecated Use `siteContacts.contact` after hydration */
export const SITE_CONTACT_EMAIL = DEFAULTS.contact;
/** @deprecated Use `siteContacts.customer` after hydration */
export const SITE_CUSTOMER_EMAIL = DEFAULTS.customer;
/** @deprecated Use `siteContacts.merchant` after hydration */
export const SITE_MERCHANT_EMAIL = DEFAULTS.merchant;
/** @deprecated Use `siteContacts.wholesale` after hydration */
export const SITE_WHOLESALE_EMAIL = DEFAULTS.wholesale;
/** @deprecated Use `siteContacts.whatsapp` after hydration */
export const LANDING_WHATSAPP_NUMBER = DEFAULTS.whatsapp;

export async function hydrateSiteConfig(force = false): Promise<void> {
  try {
    const config = await fetchPublicConfig(force);
    const general = (config.general || {}) as Record<string, unknown>;
    const contacts = (general.contacts || {}) as Record<string, string>;

    if (typeof contacts.customer === 'string') siteContacts.customer = contacts.customer;
    if (typeof contacts.merchant === 'string') siteContacts.merchant = contacts.merchant;
    if (typeof contacts.wholesale === 'string') siteContacts.wholesale = contacts.wholesale;
    if (typeof contacts.company === 'string') siteContacts.company = contacts.company;
    if (typeof general.contactEmail === 'string') siteContacts.contact = general.contactEmail;
    else if (typeof contacts.supportPhone === 'string') siteContacts.contact = contacts.customer || siteContacts.contact;
    if (typeof general.supportPhone === 'string' && !contacts.customer) {
      /* phone only — keep email defaults */
    }
    if (typeof general.platformName === 'string') siteContacts.platformName = general.platformName;
    if (typeof general.logoUrl === 'string') siteContacts.logoUrl = general.logoUrl;
  } catch {
    /* keep defaults */
  }
}

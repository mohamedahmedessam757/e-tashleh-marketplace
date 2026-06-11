
import { common } from './common';
import { auth } from './auth';
import { customer } from './customer';
import { merchant } from './merchant';
import { admin } from './admin';

// Merge strategy:
// 1. common: Available as `t.common`
// 2. auth: Spreads its keys (nav, hero, auth, etc) to root for backwards compatibility.
// 3. admin: Available as `t.admin`
// 4. customer & merchant: Merged into `t.dashboard` to support `t.dashboard.merchant...` and `t.dashboard.profile...`

export const translations = {
  ar: {
    common: common.ar,
    ...auth.ar, // Spread nav, hero, etc. to root
    auth: auth.ar.authSection, // Special case for auth section to avoid collision if any
    admin: admin.ar,
    dashboard: {
      ...customer.ar,
      merchant: merchant.ar,
    }
  },
  en: {
    common: common.en,
    ...auth.en,
    auth: auth.en.authSection,
    admin: admin.en,
    dashboard: {
      ...customer.en,
      merchant: merchant.en,
    }
  }
};

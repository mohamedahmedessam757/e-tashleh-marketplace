export interface PhoneCountryOption {
  code: string;
  flag: string;
  country: string;
  countryAr: string;
}

export const PHONE_COUNTRY_OPTIONS: PhoneCountryOption[] = [
  { code: '+966', flag: '🇸🇦', country: 'Saudi Arabia', countryAr: 'السعودية' },
  { code: '+971', flag: '🇦🇪', country: 'United Arab Emirates', countryAr: 'الإمارات' },
  { code: '+973', flag: '🇧🇭', country: 'Bahrain', countryAr: 'البحرين' },
  { code: '+974', flag: '🇶🇦', country: 'Qatar', countryAr: 'قطر' },
  { code: '+965', flag: '🇰🇼', country: 'Kuwait', countryAr: 'الكويت' },
  { code: '+968', flag: '🇴🇲', country: 'Oman', countryAr: 'عُمان' },
];

export function parseStoredPhone(
  fullPhone?: string | null,
  storedCountryCode?: string | null,
  storedCountry?: string | null,
): { countryCode: string; phone: string; country: string } {
  const defaultOption = PHONE_COUNTRY_OPTIONS[0];
  if (!fullPhone) {
    return {
      countryCode: storedCountryCode || defaultOption.code,
      phone: '',
      country: storedCountry || defaultOption.country,
    };
  }

  const matched =
    PHONE_COUNTRY_OPTIONS.find((c) => fullPhone.startsWith(c.code)) ||
    (storedCountryCode
      ? PHONE_COUNTRY_OPTIONS.find((c) => c.code === storedCountryCode)
      : undefined);

  if (matched) {
    return {
      countryCode: matched.code,
      phone: fullPhone.slice(matched.code.length).replace(/\D/g, ''),
      country: storedCountry || matched.country,
    };
  }

  return {
    countryCode: storedCountryCode || defaultOption.code,
    phone: fullPhone.replace(/\D/g, ''),
    country: storedCountry || defaultOption.country,
  };
}

export function buildFullPhone(countryCode: string, localPhone: string): string {
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  const digits = localPhone.replace(/\D/g, '');
  return `${code}${digits}`;
}

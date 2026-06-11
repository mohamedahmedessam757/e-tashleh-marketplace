
export const SecurityUtils = {
  /**
   * Masks an IBAN leaving only the last 4 digits visible
   * Format: SA **************** 1234
   */
  maskIBAN: (iban: string): string => {
    if (!iban) return '';
    const cleanIBAN = iban.replace(/\s/g, '');
    if (cleanIBAN.length < 10) return iban;
    const last4 = cleanIBAN.slice(-4);
    const country = cleanIBAN.slice(0, 2);
    return `${country} ${'*'.repeat(16)} ${last4}`;
  },

  /**
   * Masks a phone number
   * Format: 055 ***** 67
   */
  maskPhone: (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/(\d{3})\d+(\d{2})/, '$1*****$2');
  },

  /**
   * Masks an email address
   * Format: m*******@domain.com
   */
  maskEmail: (email: string): string => {
    if (!email) return '';
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    const maskedName = name.charAt(0) + '*'.repeat(Math.min(name.length - 1, 6));
    return `${maskedName}@${domain}`;
  },

  /**
   * Generates a pseudo-random session ID for audit logs
   */
  generateSessionID: (): string => {
    return 'sess_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * Mock encryption function (Frontend only representation)
   */
  encryptData: (data: string): string => {
    return btoa(data); // Base64 for demo purposes
  }
};

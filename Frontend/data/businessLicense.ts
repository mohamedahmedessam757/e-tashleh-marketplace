export interface LicenseField {
  labelAr: string;
  labelEn: string;
  valueAr: string;
  valueEn: string;
}

export interface LicenseSection {
  titleAr: string;
  titleEn: string;
  fields: LicenseField[];
}

export const BUSINESS_LICENSE_NUMBER = '45000927';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Served inline by backend — not a direct public static file URL */
export const NOMO_REGISTRY_PDF_URL = `${API_URL}/public/documents/nomo-registry`;

export const businessLicenseSections: LicenseSection[] = [
  {
    titleAr: 'معلومات الرخصة',
    titleEn: 'License Information',
    fields: [
      {
        labelAr: 'رقم السجل الاقتصادي',
        labelEn: 'ERN Number',
        valueAr: '41200000000045000927',
        valueEn: '41200000000045000927',
      },
      {
        labelAr: 'رقم الرخصة المحلي',
        labelEn: 'BL Local No',
        valueAr: '45000927',
        valueEn: '45000927',
      },
      {
        labelAr: 'الاسم الاقتصادي عربي',
        labelEn: 'Business Name Arabic',
        valueAr: 'إليب ش.م.ح. - ذ.م.م',
        valueEn: 'إليب ش.م.ح. - ذ.م.م',
      },
      {
        labelAr: 'الاسم الاقتصادي إنجليزي',
        labelEn: 'Business Name English',
        valueAr: 'Ellipp FZ_LLC',
        valueEn: 'Ellipp FZ_LLC',
      },
      {
        labelAr: 'الشكل القانوني',
        labelEn: 'Legal Form',
        valueAr: 'شركة منطقة حرة - ذات مسؤولية محدودة',
        valueEn: 'Free Zone Limited Liability Company FZ_LLC',
      },
      {
        labelAr: 'فرع',
        labelEn: 'Branch',
        valueAr: 'لا',
        valueEn: 'No',
      },
      {
        labelAr: 'تاريخ التأسيس',
        labelEn: 'Est. Date',
        valueAr: '06/20/2022',
        valueEn: '06/20/2022',
      },
      {
        labelAr: 'تاريخ التعديل',
        labelEn: 'Modification Date',
        valueAr: '12/31/9999',
        valueEn: '12/31/9999',
      },
      {
        labelAr: 'تاريخ الانتهاء',
        labelEn: 'Expiry Date',
        valueAr: '06/19/2027',
        valueEn: '06/19/2027',
      },
      {
        labelAr: 'حالة',
        labelEn: 'Status',
        valueAr: 'صالح',
        valueEn: 'Valid',
      },
    ],
  },
  {
    titleAr: 'النشاط التجاري',
    titleEn: 'Business Activity',
    fields: [
      {
        labelAr: 'اسم النشاط عربي',
        labelEn: 'BA Desc. Arabic',
        valueAr: 'المتاجرة الإلكترونية بالمنتجات والخدمات مجمع للتعامل الإلكتروني',
        valueEn: 'المتاجرة الإلكترونية بالمنتجات والخدمات مجمع للتعامل الإلكتروني',
      },
      {
        labelAr: 'اسم النشاط إنجليزي',
        labelEn: 'BA Desc. English',
        valueAr: 'Products and Services E-Trading Portal',
        valueEn: 'Products and Services E-Trading Portal',
      },
      {
        labelAr: 'الإمارة',
        labelEn: 'Emirate',
        valueAr: 'رأس الخيمة',
        valueEn: 'Ras Al Khaimah',
      },
    ],
  },
  {
    titleAr: 'التسجيل',
    titleEn: 'Registration',
    fields: [
      {
        labelAr: 'حالة',
        labelEn: 'Status',
        valueAr: 'صالح',
        valueEn: 'Valid',
      },
      {
        labelAr: 'تسجيل دائرة',
        labelEn: 'Registration ED',
        valueAr: 'هيئة مناطق رأس الخيمة الاقتصادية - راكز',
        valueEn: 'Ras Al Khaimah Economic Zone Authority - RAKEZ',
      },
      {
        labelAr: 'تسجيل فرع',
        labelEn: 'Registration ED Branch',
        valueAr: 'هيئة مناطق رأس الخيمة الاقتصادية - راكز',
        valueEn: 'Ras Al Khaimah Economic Zone Authority - RAKEZ',
      },
    ],
  },
  {
    titleAr: 'تفاصيل المدراء',
    titleEn: 'Managers Details',
    fields: [
      {
        labelAr: 'اسم المدراء عربي',
        labelEn: 'Manager Names Arabic',
        valueAr: '—',
        valueEn: '—',
      },
      {
        labelAr: 'اسم المدراء إنجليزي',
        labelEn: 'Manager Names English',
        valueAr: '—',
        valueEn: '—',
      },
    ],
  },
  {
    titleAr: 'تفاصيل الاتصال',
    titleEn: 'Contact Details',
    fields: [
      {
        labelAr: 'رقم الهاتف المحمول',
        labelEn: 'Mobile No',
        valueAr: '—',
        valueEn: '—',
      },
      {
        labelAr: 'رقم الهاتف',
        labelEn: 'Phone No',
        valueAr: '—',
        valueEn: '—',
      },
      {
        labelAr: 'البريد الإلكتروني',
        labelEn: 'EMail',
        valueAr: '—',
        valueEn: '—',
      },
      {
        labelAr: 'الموقع الإلكتروني',
        labelEn: 'Web Site URL',
        valueAr: '—',
        valueEn: '—',
      },
    ],
  },
  {
    titleAr: 'تفاصيل العنوان',
    titleEn: 'Address Details',
    fields: [
      {
        labelAr: 'العنوان الكامل',
        labelEn: 'Full Address',
        valueAr: 'FDBC0634. Compass Building. Al Shohada Road. AL Hamra Industrial Zone. FZ. Ras Al Khaimah.',
        valueEn: 'FDBC0634. Compass Building. Al Shohada Road. AL Hamra Industrial Zone. FZ. Ras Al Khaimah.',
      },
    ],
  },
];

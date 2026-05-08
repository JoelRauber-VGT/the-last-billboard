export const config = {
  // Mechanik-Modus: 'v2_displacement' (primary) oder 'v1_additive'
  mode: 'v2_displacement' as 'v2_displacement' | 'v1_additive',

  // Finanzielles
  minBidEur: 1,
  commissionRate: 0.10, // 10% Platform-Fee
  currency: 'EUR' as const,

  // Zeit (nur für v2_displacement)
  billboardEndsAt: new Date('2026-06-30T23:59:59Z'),

  // Upload-Limits
  maxImageSizeMb: 10,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],

  // i18n
  defaultLocale: 'en' as const,
  locales: ['en', 'de', 'fr', 'es'] as const,

  // Legal / Impressum (server-side env; read-only at request time)
  legal: {
    operatorName: process.env.LEGAL_OPERATOR_NAME ?? '',
    operatorAddress: process.env.LEGAL_OPERATOR_ADDRESS ?? '',
    operatorPhone: process.env.LEGAL_OPERATOR_PHONE ?? '',
    operatorVat: process.env.LEGAL_OPERATOR_VAT ?? '',
    operatorRegister: process.env.LEGAL_OPERATOR_REGISTER ?? '',
    contactEmail: process.env.LEGAL_CONTACT_EMAIL ?? '',
    legalEmail:
      process.env.LEGAL_EMAIL ?? process.env.LEGAL_CONTACT_EMAIL ?? '',
    privacyEmail:
      process.env.LEGAL_PRIVACY_EMAIL ?? process.env.LEGAL_CONTACT_EMAIL ?? '',
    governingLawJurisdiction: process.env.LEGAL_GOVERNING_LAW ?? '',
  },
} as const;

export type AppConfig = typeof config;

export const config = {
  // Mechanik-Modus: 'v2_displacement' (primary) oder 'v1_additive'
  mode: 'v2_displacement' as 'v2_displacement' | 'v1_additive',

  // Finanzielles
  minBidEur: 1,
  commissionRate: 0.10, // 10% Platform-Fee
  currency: 'EUR' as const,

  // Canvas
  canvasWidth: 10000,
  canvasHeight: 10000,
  minBlockPixelSize: 40,

  // Zeit (nur für v2_displacement)
  billboardEndsAt: new Date('2026-06-30T23:59:59Z'),

  // Upload-Limits
  maxImageSizeMb: 10,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],

  // i18n
  defaultLocale: 'en' as const,
  locales: ['en', 'de', 'fr', 'es'] as const,
} as const;

export type AppConfig = typeof config;

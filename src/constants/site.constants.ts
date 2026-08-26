/** Single source for identity strings. Nothing may hardcode these inline. */
export const SITE_NAME = 'Passport Photo Checker' as const;

export const SITE_TAGLINE = 'Check your passport or visa photo before you submit it' as const;

export const SITE_DESCRIPTION =
  'Check a passport or visa photo against the official requirements for your country. Runs entirely in your browser — your photo is never uploaded.' as const;

/** Shown with every result. Wording is deliberate: we never claim acceptance. */
export const ACCEPTANCE_DISCLAIMER =
  'We check your photo against the issuing authority’s published specification. The final decision always belongs to that authority.' as const;

export const DEFAULT_LOCALE = 'en' as const;

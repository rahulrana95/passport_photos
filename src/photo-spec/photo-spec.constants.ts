/**
 * Whether a human has checked this specification against the issuing
 * authority's own page.
 *
 * 'provisional' means the values are believed correct but nobody has confirmed
 * them at the source. Provisional specs are excluded from the public registry:
 * presenting an unverified government requirement as authoritative is exactly
 * the failure this product exists to prevent.
 */
export const VERIFICATION_STATUSES = ['verified', 'provisional'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/**
 * How long a specification may go unchecked before the UI stops presenting it as
 * current. Government requirements change without notice, and a silently stale
 * requirement is worse than no requirement — the reader trusts it either way.
 */
export const SPEC_REVERIFICATION_DAYS = 180;

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_MINUTE = 60;
export const MS_PER_SECOND = 1000;

/**
 * A ratio needs more decimal places than a millimetre: at four places a head
 * height of 0.5000 of a 45mm photo resolves back to within a hundredth of a
 * millimetre, which is finer than any authority specifies.
 */
export const RATIO_PRECISION_DIGITS = 4;

/** Where a spec is authored in the unit the issuing authority actually uses. */
export const HEAD_HEIGHT_UNITS = ['mm', 'ratio'] as const;
export type HeadHeightUnit = (typeof HEAD_HEIGHT_UNITS)[number];

export const BACKGROUND_COLOURS = ['white', 'off-white', 'light-grey', 'cream', 'light-blue'] as const;
export type BackgroundColour = (typeof BACKGROUND_COLOURS)[number];

export const GLASSES_POLICIES = ['prohibited', 'permitted-no-glare', 'permitted'] as const;
export type GlassesPolicy = (typeof GLASSES_POLICIES)[number];

export const HEAD_COVERING_POLICIES = ['prohibited', 'religious-only', 'permitted'] as const;
export type HeadCoveringPolicy = (typeof HEAD_COVERING_POLICIES)[number];

export const EXPRESSION_POLICIES = ['neutral-mouth-closed', 'neutral-slight-smile-allowed'] as const;
export type ExpressionPolicy = (typeof EXPRESSION_POLICIES)[number];

/**
 * Drives the entire editing UI. Where this is 'prohibited' the background
 * replacement feature is not offered at all — since 1 January 2026 the US
 * auto-flags photos showing signs of AI editing, so offering the convenience
 * there would cause the rejection we exist to prevent.
 */
export const AI_EDITING_POLICIES = ['prohibited', 'discouraged', 'allowed'] as const;
export type AiEditingPolicy = (typeof AI_EDITING_POLICIES)[number];

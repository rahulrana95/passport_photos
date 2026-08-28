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

/**
 * Who is allowed to take the photograph that gets submitted.
 *
 * Not a detail. Where this is not 'self-service' the reader cannot submit a
 * photograph they took themselves however perfect it is, and a checker that
 * said "this passes" without saying so would have wasted their afternoon.
 *
 * France requires a photographer it has authorised, or a booth running a system
 * its interior ministry has certified. Germany went further on 1 May 2025: for passports
 * and identity cards the photograph must be captured at the authority itself or
 * delivered to it by a photographer over a secure channel, so no self-taken
 * photograph is submissible at all. Both still publish the requirements the
 * picture must meet, which is what makes checking one worth doing — you can
 * find out what will be wrong before you pay somebody to take it.
 */
export const SUBMISSION_ROUTES = [
  'self-service',
  'authorised-photographer',
  'authority-capture',
] as const;
export type SubmissionRoute = (typeof SUBMISSION_ROUTES)[number];

/**
 * The resolution we render an export at when the authority published none.
 *
 * Deliberately separate from `print.dpi`, which means "the resolution this
 * authority requires". Most do not state one, and writing 300 into their specs
 * would put a number in the requirements table that nobody published. This is
 * our own choice of how finely to render a print, it is never presented as a
 * requirement, and 300 is the figure the authorities that do state one use.
 */
export const EXPORT_DPI_FALLBACK = 300;

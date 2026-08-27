/**
 * THE REQUIREMENT TAXONOMY.
 *
 * Every rule this engine evaluates names the requirement it is about, and the
 * names come from the ICAO/ISO portrait-quality requirement set rather than
 * from us. That choice is deliberate and it is worth more than it looks:
 *
 *  - every national specification in the registry derives from ISO/IEC
 *    19794-5, so speaking its vocabulary means our wording matches the
 *    documentation the issuing authorities themselves publish;
 *  - it makes us directly comparable to the published benchmarks that score
 *    compliance tools against the same set, instead of grading ourselves
 *    against a list we invented;
 *  - and it forces us to enumerate what we do NOT check, which is the part a
 *    compliance tool is normally silent about.
 *
 * HONESTY NOTE, and it belongs in the code rather than in a commit message:
 * ISO/IEC 19794-5 is a paid standard and nobody here has read the document.
 * These identifiers are transcribed from the requirement set as enumerated in
 * the public literature built on it. They are requirement NAMES, not clause
 * references, and nothing in this codebase prints a clause number — because a
 * fabricated "ISO 19794-5 §7.2.3" beside a verdict would be the most
 * convincing thing on the page and the least true. Buying the standard and
 * attaching real clause references is tracked alongside spec verification.
 */
export const ISO_REQUIREMENT_IDS = [
  // --- Geometry -----------------------------------------------------------
  'head-image-height-ratio',
  'head-image-width-ratio',
  'vertical-position-of-face',
  'horizontal-position-of-face',
  'eye-distance',
  'roll-pitch-yaw',

  // --- Photographic quality ------------------------------------------------
  'blurred',
  'pixelation',
  'washed-out',
  'too-dark-or-light',
  'unnatural-skin-tone',
  'ink-marked-creased',
  'flash-reflection-on-skin',
  'red-eyes',
  'posterisation',

  // --- Background and lighting ---------------------------------------------
  'varied-background',
  'unnatural-background-colour',
  'shadows-behind-head',
  'shadows-across-face',

  // --- Eyes and eyewear -----------------------------------------------------
  'eyes-closed',
  'hair-across-eyes',
  'dark-tinted-lenses',
  'flash-reflection-on-lenses',
  'frames-too-heavy',
  'frame-covering-eyes',

  // --- Head and face --------------------------------------------------------
  'hat-or-cap',
  'veil-over-face',
  'mouth-open',
  'neutral-expression',
  'presence-of-other-faces',
] as const;

export type IsoRequirementId = (typeof ISO_REQUIREMENT_IDS)[number];

/**
 * Requirements the issuing authority imposes on the application rather than on
 * the image.
 *
 * Kept apart from the ISO list on purpose. How recently a photograph was taken
 * is not a property of the pixels and no face-image standard covers it, so
 * filing it under an ISO identifier would misrepresent both.
 */
export const APPLICATION_REQUIREMENT_IDS = ['photo-age'] as const;

export type ApplicationRequirementId = (typeof APPLICATION_REQUIREMENT_IDS)[number];

/**
 * Why a requirement has no rule.
 *
 * 'undetectable' and 'planned' are different admissions and collapsing them
 * would be a small lie in whichever direction it went. 'undetectable' says the
 * information is not recoverable from a single photograph by us or by anyone —
 * calling something planned when it is impossible promises work that will
 * never arrive. 'planned' says we simply have not built it yet — calling that
 * undetectable claims an impossibility to excuse a gap.
 */
export const UNCOVERED_REASONS = ['undetectable', 'planned'] as const;

export type UncoveredReason = (typeof UNCOVERED_REASONS)[number];

/** Either a rule answers this requirement, or here is why none does. */
export type RequirementDisposition = 'by-rule' | UncoveredReason;

/**
 * What happens to every requirement in the standard. All thirty of them.
 *
 * A complete record rather than a list of exceptions, which is the difference
 * between a coverage map and a marketing page. Adding a requirement to the
 * list above without deciding what we do about it does not compile — so the
 * uncomfortable half of the map cannot be left out by inattention, which is
 * exactly how it would be left out.
 *
 * 'by-rule' says a rule in the registry answers it; which rules, and whether
 * they measure it or ask the reader, is derived from the registry rather than
 * repeated here, so the published map cannot drift from what the engine does.
 */
export const ISO_REQUIREMENT_DISPOSITION: Readonly<
  Record<IsoRequirementId, RequirementDisposition>
> = {
  'head-image-height-ratio': 'by-rule',
  'vertical-position-of-face': 'by-rule',
  'horizontal-position-of-face': 'by-rule',
  'eye-distance': 'by-rule',
  'roll-pitch-yaw': 'by-rule',
  blurred: 'by-rule',
  pixelation: 'by-rule',
  'washed-out': 'by-rule',
  'too-dark-or-light': 'by-rule',
  'ink-marked-creased': 'by-rule',
  'varied-background': 'by-rule',
  'unnatural-background-colour': 'by-rule',
  'shadows-behind-head': 'by-rule',
  'eyes-closed': 'by-rule',
  'hair-across-eyes': 'by-rule',
  'dark-tinted-lenses': 'by-rule',
  'flash-reflection-on-lenses': 'by-rule',
  'frames-too-heavy': 'by-rule',
  'frame-covering-eyes': 'by-rule',
  'hat-or-cap': 'by-rule',
  'veil-over-face': 'by-rule',
  'mouth-open': 'by-rule',
  'neutral-expression': 'by-rule',
  'presence-of-other-faces': 'by-rule',

  // Measurable from a silhouette, and not yet measured. The mask work that
  // crown detection already does gives us most of what this needs.
  'head-image-width-ratio': 'planned',
  // Colour banding from over-compression. Detectable by histogram, unbuilt.
  posterisation: 'planned',

  // Judging whether a skin tone looks "natural" is the precise trap this
  // product refuses to walk into: the only reference such a check can have is
  // some notion of a normal complexion, and every implementation of that idea
  // has ended up telling darker-skinned people their faces are wrong. We do
  // not check it and we will not.
  'unnatural-skin-tone': 'undetectable',
  // A bright patch on a forehead and a bright forehead are the same pixels.
  'flash-reflection-on-skin': 'undetectable',
  // Needs the iris located to sub-pixel accuracy and a hue judgement inside
  // it; at the resolutions people upload, this returns noise.
  'red-eyes': 'undetectable',
  // Distinguishing a shadow cast across a face from the modelling that makes
  // a face look like a face is not something luminance alone settles.
  'shadows-across-face': 'undetectable',
};

/** The application requirements, on the same footing. */
export const APPLICATION_REQUIREMENT_DISPOSITION: Readonly<
  Record<ApplicationRequirementId, RequirementDisposition>
> = {
  'photo-age': 'by-rule',
};

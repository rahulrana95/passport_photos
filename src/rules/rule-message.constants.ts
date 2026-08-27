/**
 * Every message a rule can resolve to.
 *
 * Rules never carry text. They carry one of these identifiers, and the content
 * module holds the words — which is what makes a second language a new content
 * file rather than a rewrite of the engine, and what makes it impossible for a
 * sentence to reach a screen without passing the copy invariants (no promise
 * of acceptance, every failure carries an action).
 *
 * The shared ids are shared deliberately. Ninety bespoke sentences, most of
 * them saying "we could not measure this", is ninety chances for one of them
 * to be worded differently from the rest and read as a different meaning.
 */
export const RULE_MESSAGE_IDS = [
  // --- Shared across rules --------------------------------------------------
  'shared.pass',
  'shared.unmeasured',
  'shared.uncertain',

  // --- Shared by everything measured from the crop --------------------------
  // The geometry engine either produces all of these measurements or none of
  // them, so its failures are worded once and reused by each framing rule.
  'geometry.crown-unmeasured',
  'geometry.head-not-in-frame',
  'geometry.crop-outside-source',
  'geometry.source-resolution-too-low',
  'geometry.degenerate-geometry',

  // --- Per rule -------------------------------------------------------------
  'single-subject.multiple-faces',
  'single-subject.no-face',
  'single-subject.too-small',
  'single-subject.touches-frame-edge',
  'single-subject.pose-unreliable',

  'head-height.below',
  'head-height.above',

  'eye-line.below',
  'eye-line.above',

  'horizontal-centring.left',
  'horizontal-centring.right',

  'eye-distance.too-few-pixels',

  'resolution.too-small',

  'focus.soft',
  'focus.too-small-to-judge',

  'exposure.clipped-shadows',
  'exposure.clipped-highlights',
  'exposure.flat',

  'background-colour.wrong-colour',
  'background-uniformity.not-uniform',
  'background-shadow.shadowed',
  // Shared by all three background rules: too few background pixels makes
  // every one of them unanswerable, and for the same reason.
  'background.too-little-background',

  'head-tilt.tilted',
  'head-turn.turned',
  'head-pitch.tilted',

  'eyes-open.closed',
  'mouth-closed.open',
  'neutral-expression.smiling',

  'head-covering-visible.may-include-covering',

  'glasses.prohibited',
  'glasses.no-glare',
  'glasses.permitted',

  'head-covering-policy.prohibited',
  'head-covering-policy.religious-only',
  'head-covering-policy.permitted',

  'veil-over-face.check',
  'hair-across-eyes.check',
  'ink-or-crease.check',
  'photo-age.check',
] as const;

export type RuleMessageId = (typeof RULE_MESSAGE_IDS)[number];

/**
 * The physical actions a report can ask for.
 *
 * An action, never a diagnosis. "Your photo is under-exposed" tells a reader
 * what a histogram says; "retake it near a window" tells them what to do, and
 * only the second one gets anybody a passport.
 */
export const FIX_ACTION_KINDS = [
  'move-closer',
  'move-further',
  'eyes-higher-in-frame',
  'eyes-lower-in-frame',
  'shift-left',
  'shift-right',
  'retake-larger',
  'retake-sharper',
  'retake-more-light',
  'retake-softer-light',
  'retake-even-light',
  'change-background-colour',
  'use-plain-background',
  'move-from-wall',
  'straighten-head',
  'face-camera',
  'level-chin',
  'open-eyes',
  'close-mouth',
  'relax-expression',
  'remove-covering',
  'photograph-alone',
] as const;

export type FixActionKind = (typeof FIX_ACTION_KINDS)[number];

/** Units a measurement can be reported in. */
export const RULE_MEASUREMENT_UNITS = ['percent', 'degree', 'millimeter', 'pixel'] as const;

export type RuleMeasurementUnit = (typeof RULE_MEASUREMENT_UNITS)[number];

/**
 * Units a fix instruction can quantify itself in.
 *
 * A narrower set than the measurements above, and pixels are the ones missing.
 * "Take the photo again 40 pixels larger" is not something a person can do —
 * they cannot dial a resolution the way they can move a step closer — so the
 * shortfall is reported as a measurement against its requirement and the
 * instruction stays qualitative.
 *
 * Also absent: centimetres of camera distance. Turning "your head needs to be
 * 20% taller" into "move 30cm closer" requires knowing how far away the camera
 * already is, which no single photograph contains — the scale factor gives the
 * RATIO of the two distances and nothing more. A number invented for
 * concreteness would be wrong for anyone not standing where we guessed, and it
 * would be the most actionable-looking sentence on the page.
 */
export const FIX_AMOUNT_UNITS = ['percent', 'degree', 'millimeter'] as const;

export type FixAmountUnit = (typeof FIX_AMOUNT_UNITS)[number];

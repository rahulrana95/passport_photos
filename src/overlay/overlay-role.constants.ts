/**
 * What each annotation is about, and how it is drawn.
 *
 * COLOURS ARE LITERAL HERE, AND THAT IS DELIBERATE — it is the one place in
 * this codebase where a raw colour is correct. Every other colour is a design
 * token that swaps with the theme, because it sits on our surface. These sit on
 * the user's photograph, which has no theme: a line drawn over somebody's face
 * must be the same colour whether the page around it is light or dark, and a
 * token would make the annotation invert while the photograph underneath did
 * not.
 */

export const OVERLAY_ROLES = [
  'crop',
  'head-span',
  'head-band',
  'eye-line',
  'eye-band',
  'centre-line',
] as const;

export type OverlayRole = (typeof OVERLAY_ROLES)[number];

/**
 * EVERY STROKE IS DRAWN TWICE.
 *
 * A photograph is not a background you can choose a colour against. White lines
 * vanish on a pale wall, black lines vanish in dark hair, and any single colour
 * you pick disappears somewhere on somebody's photo — usually on exactly the
 * part being annotated, since the annotation is drawn over the subject.
 *
 * So each line gets a wide dark halo underneath and a narrow light stroke on
 * top. The pair is legible over anything: against a light photograph the halo
 * carries it, against a dark one the stroke does. This is what film and survey
 * software have always done with overlays, for the same reason.
 */
export const HALO_COLOUR = 'rgba(0, 0, 0, 0.72)';

export interface OverlayRoleStyle {
  /** The visible stroke, drawn over the halo. */
  readonly colour: string;
  /** Stroke width in SCREEN pixels — held constant however the image scales. */
  readonly strokeWidthPx: number;
  /** Extra width the halo adds on each side, in screen pixels. */
  readonly haloWidthPx: number;
  /** Dash pattern in screen pixels. Empty for a solid line. */
  readonly dashPx: readonly number[];
  /** Fill alpha for a shaded band. Zero for roles that never shade. */
  readonly shadeAlpha: number;
}

/**
 * Dash patterns do real work, not decoration.
 *
 * Roughly one man in twelve cannot separate the red from the green here, and a
 * printed report may be photocopied to grey. So no two roles that can appear
 * together share both a colour and a pattern: the crop is a solid frame, the
 * measured lines are solid, and the permitted bands — the things that are
 * limits rather than measurements — are dashed. Dashed means "where it may be",
 * solid means "where it is", everywhere in this overlay.
 */
export const OVERLAY_ROLE_STYLES: Readonly<Record<OverlayRole, OverlayRoleStyle>> = {
  crop: { colour: '#ffffff', strokeWidthPx: 2, haloWidthPx: 2, dashPx: [], shadeAlpha: 0 },
  'head-span': {
    colour: '#4dd4ac',
    strokeWidthPx: 2,
    haloWidthPx: 2,
    dashPx: [],
    shadeAlpha: 0,
  },
  'head-band': {
    colour: '#4dd4ac',
    strokeWidthPx: 1.5,
    haloWidthPx: 1.5,
    dashPx: [7, 5],
    shadeAlpha: 0.16,
  },
  'eye-line': {
    colour: '#ffc861',
    strokeWidthPx: 2,
    haloWidthPx: 2,
    dashPx: [],
    shadeAlpha: 0,
  },
  'eye-band': {
    colour: '#ffc861',
    strokeWidthPx: 1.5,
    haloWidthPx: 1.5,
    dashPx: [7, 5],
    shadeAlpha: 0.16,
  },
  'centre-line': {
    colour: '#ffffff',
    strokeWidthPx: 1,
    haloWidthPx: 1.5,
    dashPx: [3, 6],
    shadeAlpha: 0,
  },
};

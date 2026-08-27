/**
 * The sheets people actually print on.
 *
 * Three, not a menu. 4x6 inches is what every North American drugstore kiosk
 * accepts; 10x15cm is the same idea in the rest of the world and is NOT the
 * same size — 100x150 against 101.6x152.4, a difference of a millimetre and a
 * half that decides whether a column fits; A4 is what somebody with a home
 * printer has in the tray.
 *
 * Sizes are in millimetres because a printed photograph is a physical object.
 * Every rejection this product exists to prevent is a millimetre problem.
 */

export const SHEET_SIZE_IDS = ['4x6in', '10x15cm', 'a4'] as const;

export type SheetSizeId = (typeof SHEET_SIZE_IDS)[number];

export interface SheetSize {
  readonly id: SheetSizeId;
  readonly widthMm: number;
  readonly heightMm: number;
  /** The strip around the edge this kind of printer cannot be trusted with. */
  readonly marginMm: number;
}

/**
 * The margins differ, and the difference is worth two photographs.
 *
 * A drugstore kiosk prints 4x6 borderless, which it achieves by overfilling
 * the paper slightly and losing a couple of percent off every edge. Three
 * millimetres of safety is enough to keep a photograph out of what gets lost,
 * and demanding five would cost a whole row.
 *
 * A home printer feeding A4 physically cannot reach the edge — the rollers are
 * there — and reserves closer to five. Being wrong in that direction is the
 * expensive one: a photograph laid out into the unprintable margin comes back
 * with a white band across it, which is a rejection.
 */
export const PHOTO_PAPER_MARGIN_MM = 3;
export const OFFICE_PAPER_MARGIN_MM = 5;

export const SHEET_SIZES: Readonly<Record<SheetSizeId, SheetSize>> = {
  '4x6in': { id: '4x6in', widthMm: 101.6, heightMm: 152.4, marginMm: PHOTO_PAPER_MARGIN_MM },
  '10x15cm': { id: '10x15cm', widthMm: 100, heightMm: 150, marginMm: PHOTO_PAPER_MARGIN_MM },
  a4: { id: 'a4', widthMm: 210, heightMm: 297, marginMm: OFFICE_PAPER_MARGIN_MM },
};

/**
 * The gap left between photographs.
 *
 * Wide enough for scissors and a human hand. Photographs butted against each
 * other cannot be cut apart without cutting into one of them, and a passport
 * photograph missing two millimetres down one side is a photograph of the
 * wrong size.
 *
 * Three rather than four, and the millimetre matters: at four, a 35 by 45
 * photograph fits four times on a 4 by 6 sheet instead of the six that every
 * high-street printer manages.
 */
export const CUT_GUTTER_MM = 3;

/**
 * How far a cut mark extends past the corner of a photograph.
 *
 * Outside the photograph, never across it: a line printed over a face is ink
 * on the photograph the reader then submits.
 */
export const CUT_MARK_LENGTH_MM = 3;

/** Printed at this resolution, which is what photo kiosks work at. */
export const SHEET_PRINT_DPI = 300;

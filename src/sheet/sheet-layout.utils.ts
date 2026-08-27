import { HALF } from '@/measurement/angle.constants';
import { CUT_GUTTER_MM, OFFICE_PAPER_MARGIN_MM } from './sheet-size.constants';
import type {
  Millimetres,
  SheetLayoutResult,
  SheetPlan,
  SheetSlot,
} from './sheet-layout.types';

export interface SheetLayoutOptions {
  readonly marginMm?: number;
  readonly gutterMm?: number;
}

/**
 * Fits as many photographs onto a sheet as will go.
 *
 * FOUR ARRANGEMENTS ARE TRIED, not one. A 35 by 45 photograph on a 4 by 6 inch
 * sheet holds four one way and six the other, and the difference is the whole
 * point of printing a sheet rather than a single photograph. Both sheet
 * orientations and both photograph orientations are evaluated and the best is
 * taken, because there is no argument for handing somebody four copies when
 * six fit — a print costs the same either way.
 *
 * Laying a photograph on its side is not a compromise. It is cut out
 * afterwards, and a cut photograph has no orientation.
 *
 * LEFTOVER SPACE BECOMES MARGIN, which is the answer to a partial column. The
 * block of photographs is centred in the printable area rather than pushed
 * into one corner, so the remainder is shared between two edges instead of
 * forming a stub on one of them that a person then tries to cut.
 */

interface Arrangement {
  readonly sheet: Millimetres;
  readonly photo: Millimetres;
  readonly rotated: boolean;
}

const turned = (size: Millimetres): Millimetres => ({
  widthMm: size.heightMm,
  heightMm: size.widthMm,
});

/** How many photographs fit along one edge, gutters included. */
const fitCount = (usableMm: number, photoMm: number, gutterMm: number): number =>
  Math.floor((usableMm + gutterMm) / (photoMm + gutterMm));

const planArrangement = (
  arrangement: Arrangement,
  marginMm: number,
  gutterMm: number,
): SheetPlan => {
  const usableWidth = arrangement.sheet.widthMm - marginMm * HALF;
  const usableHeight = arrangement.sheet.heightMm - marginMm * HALF;
  const columns = Math.max(0, fitCount(usableWidth, arrangement.photo.widthMm, gutterMm));
  const rows = Math.max(0, fitCount(usableHeight, arrangement.photo.heightMm, gutterMm));

  const blockWidth =
    columns * arrangement.photo.widthMm + Math.max(0, columns - 1) * gutterMm;
  const blockHeight = rows * arrangement.photo.heightMm + Math.max(0, rows - 1) * gutterMm;
  const originX = (arrangement.sheet.widthMm - blockWidth) / HALF;
  const originY = (arrangement.sheet.heightMm - blockHeight) / HALF;

  const slots: SheetSlot[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push({
        xMm: originX + column * (arrangement.photo.widthMm + gutterMm),
        yMm: originY + row * (arrangement.photo.heightMm + gutterMm),
      });
    }
  }

  return {
    sheet: arrangement.sheet,
    photo: arrangement.photo,
    rotated: arrangement.rotated,
    columns,
    rows,
    count: columns * rows,
    slots,
  };
};

export const planSheet = (
  sheet: Millimetres,
  photo: Millimetres,
  options: SheetLayoutOptions = {},
): SheetLayoutResult => {
  const marginMm = options.marginMm ?? OFFICE_PAPER_MARGIN_MM;
  const gutterMm = options.gutterMm ?? CUT_GUTTER_MM;

  const arrangements: readonly Arrangement[] = [
    { sheet, photo, rotated: false },
    { sheet, photo: turned(photo), rotated: true },
    { sheet: turned(sheet), photo, rotated: false },
    { sheet: turned(sheet), photo: turned(photo), rotated: true },
  ];

  // Reduced rather than sorted: a sort would have to break ties, and the first
  // arrangement that achieves the best count is the one that leaves the sheet
  // the way round the reader gave it to us.
  const best = arrangements
    .map((arrangement) => planArrangement(arrangement, marginMm, gutterMm))
    .reduce((winner, candidate) => (candidate.count > winner.count ? candidate : winner));

  return best.count === 0 ? { ok: false, reason: 'photo-larger-than-sheet' } : { ok: true, plan: best };
};

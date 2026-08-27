import { HALF } from '@/measurement/angle.constants';
import { millimetresToPoints } from '@/pdf/image-page.utils';
import {
  LINE_HEIGHT_FACTOR,
  REPORT_MARGIN_MM,
  REPORT_PAGE_HEIGHT_MM,
  REPORT_PAGE_WIDTH_MM,
} from './pdf-text.constants';
import type { PdfItem, PdfPageSpec } from '@/pdf/pdf-document.types';
import type { EncodedReportBlock } from './report-block.types';

export const PAGE_WIDTH_PT = millimetresToPoints(REPORT_PAGE_WIDTH_MM);
export const PAGE_HEIGHT_PT = millimetresToPoints(REPORT_PAGE_HEIGHT_MM);
export const MARGIN_PT = millimetresToPoints(REPORT_MARGIN_MM);
/** Both margins come out of the width. */
export const TEXT_WIDTH_PT = PAGE_WIDTH_PT - MARGIN_PT * HALF;

const blockHeight = (block: EncodedReportBlock): number =>
  block.kind === 'image'
    ? block.heightPt + block.spaceAfterPt
    : block.lines.reduce((total, line) => total + line.sizePt * LINE_HEIGHT_FACTOR, 0) +
      block.spaceAfterPt;

/**
 * Flows blocks down pages, starting a new one when the next will not fit.
 *
 * COORDINATES ARE CONVERTED HERE, once, and this is the only place in the
 * product that knows a PDF page counts upward from its bottom edge. Laying out
 * a document downward and writing it upward are both natural; doing the
 * conversion in one function is what stops half the items being upside down.
 *
 * A block never splits. That costs some white space at the foot of a page and
 * it buys the thing that matters: a rule's finding and the thing to do about
 * it always appear together.
 *
 * A single block taller than a whole page is placed anyway, overflowing rather
 * than vanishing. Nothing this report contains is that tall — the longest is a
 * wrapped instruction of a few lines — and a block that silently disappeared
 * would be a finding the reader never sees.
 */
export const paginate = (blocks: readonly EncodedReportBlock[]): readonly PdfPageSpec[] => {
  const pages: PdfItem[][] = [];
  let items: PdfItem[] = [];
  let cursor = MARGIN_PT;

  const startPage = (): void => {
    pages.push(items);
    items = [];
    cursor = MARGIN_PT;
  };

  for (const block of blocks) {
    const height = blockHeight(block);

    if (items.length > 0 && cursor + height > PAGE_HEIGHT_PT - MARGIN_PT) startPage();

    if (block.kind === 'image') {
      items.push({
        kind: 'image',
        xPt: MARGIN_PT,
        // The image is placed by its bottom-left corner, so the cursor — which
        // measures down from the top — has to reach past its full height.
        yPt: PAGE_HEIGHT_PT - cursor - block.heightPt,
        widthPt: block.widthPt,
        heightPt: block.heightPt,
        image: block.image,
      });
      cursor += height;
      continue;
    }

    for (const line of block.lines) {
      cursor += line.sizePt * LINE_HEIGHT_FACTOR;

      items.push({
        kind: 'text',
        xPt: MARGIN_PT + line.indentPt,
        // Text sits ON its baseline, which is the bottom of the line just
        // advanced past.
        yPt: PAGE_HEIGHT_PT - cursor,
        sizePt: line.sizePt,
        font: line.font,
        text: line.text,
      });
    }

    cursor += block.spaceAfterPt;
  }

  pages.push(items);

  return pages.map((pageItems) => ({
    widthPt: PAGE_WIDTH_PT,
    heightPt: PAGE_HEIGHT_PT,
    items: pageItems,
  }));
};

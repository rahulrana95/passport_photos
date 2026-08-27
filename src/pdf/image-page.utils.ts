import { MM_PER_INCH, POINTS_PER_INCH } from '@/constants/measurement.constants';
import { buildPdfDocument } from './pdf-document';
import type { PdfImageResource } from './pdf-document.types';

export interface JpegPdfPage {
  /** The encoded photograph sheet, embedded without re-compression. */
  readonly jpeg: Uint8Array;
  readonly imageWidthPx: number;
  readonly imageHeightPx: number;
  readonly pageWidthMm: number;
  readonly pageHeightMm: number;
}

export const millimetresToPoints = (millimetres: number): number =>
  (millimetres / MM_PER_INCH) * POINTS_PER_INCH;

/**
 * A single page that is nothing but one image, filling it exactly.
 *
 * The page is the sheet's physical size, so a print dialogue set to 100%
 * produces photographs of the size the specification asks for. That is the
 * only number in the file a ruler can disagree with, and it is the one the
 * whole feature exists for.
 *
 * Nothing is positioned inside the image: the sheet raster already carries the
 * photographs where they belong, and a second coordinate system to get wrong
 * is a second coordinate system to get wrong.
 */
export const buildJpegPdf = (page: JpegPdfPage): Uint8Array => {
  const widthPt = millimetresToPoints(page.pageWidthMm);
  const heightPt = millimetresToPoints(page.pageHeightMm);
  const image: PdfImageResource = {
    jpeg: page.jpeg,
    widthPx: page.imageWidthPx,
    heightPx: page.imageHeightPx,
  };

  return buildPdfDocument({
    images: [image],
    pages: [
      {
        widthPt,
        heightPt,
        items: [{ kind: 'image', xPt: 0, yPt: 0, widthPt, heightPt, image: 0 }],
      },
    ],
  });
};

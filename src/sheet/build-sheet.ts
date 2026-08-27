import { DEFAULT_JPEG_QUALITY } from '@/encode/encode.constants';
import { setJfifDensity } from '@/encode/jfif-density.utils';
import { planSheet } from './sheet-layout.utils';
import { buildJpegPdf } from '@/pdf/image-page.utils';
import { renderSheet } from './render-sheet.utils';
import { SHEET_PRINT_DPI } from './sheet-size.constants';
import type { JpegEncoder } from '@/encode/jpeg-encoder.types';
import type { Millimetres, SheetLayoutFailure, SheetPlan } from './sheet-layout.types';
import type { SheetSize } from './sheet-size.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';

export interface PrintSheet {
  readonly plan: SheetPlan;
  /** The sheet as an image, for a kiosk that takes a photo file. */
  readonly jpeg: Uint8Array;
  /** The same sheet as a page, for a print dialogue or a print shop. */
  readonly pdf: Uint8Array;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly dpi: number;
}

export type PrintSheetResult =
  | { readonly ok: true; readonly sheet: PrintSheet }
  | { readonly ok: false; readonly reason: SheetLayoutFailure };

/**
 * Turns one compliant photograph into a sheet of them, in both formats.
 *
 * TWO FORMATS BECAUSE THERE ARE TWO COUNTERS. A drugstore kiosk takes a photo
 * file off a phone or a memory stick and prints it as a 4x6; a print shop, a
 * library or a home printer takes a PDF and honours its page size. Offering
 * only one of them sends half the readers away to find a converter, and a
 * converter is exactly the thing that will re-compress the photograph or
 * silently scale it to fit.
 *
 * NO BYTE CEILING is applied here, unlike the file for submission. This one is
 * going to a printer rather than an upload form, and squeezing it would trade
 * print quality for a limit nobody is enforcing.
 *
 * The resolution is written into the JPEG as well as into the PDF page size.
 * Both routes have to produce the same physical object, and a JPEG without a
 * declared density prints at whatever size the kiosk software decides.
 */
export const buildPrintSheet = async (
  encoder: JpegEncoder,
  photo: PixelBuffer,
  photoSizeMm: Millimetres,
  sheet: SheetSize,
  dpi: number = SHEET_PRINT_DPI,
): Promise<PrintSheetResult> => {
  const layout = planSheet(sheet, photoSizeMm, { marginMm: sheet.marginMm });
  if (!layout.ok) return { ok: false, reason: layout.reason };

  const raster = renderSheet(photo, layout.plan, dpi);
  const encoded = await encoder.encode(raster, DEFAULT_JPEG_QUALITY);
  const jpeg = setJfifDensity(encoded, dpi);

  return {
    ok: true,
    sheet: {
      plan: layout.plan,
      jpeg,
      pdf: buildJpegPdf({
        jpeg,
        imageWidthPx: raster.width,
        imageHeightPx: raster.height,
        pageWidthMm: layout.plan.sheet.widthMm,
        pageHeightMm: layout.plan.sheet.heightMm,
      }),
      widthPx: raster.width,
      heightPx: raster.height,
      dpi,
    },
  };
};

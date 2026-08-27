import type { ReportFont } from '@/report/pdf-text.constants';
import type { WinAnsiText } from '@/report/winansi.utils';

export interface PdfImageResource {
  /** Embedded verbatim through DCTDecode. Never re-encoded. */
  readonly jpeg: Uint8Array;
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * COORDINATES ARE PDF-NATIVE: the origin is the bottom-left of the page and y
 * increases upward.
 *
 * Not the direction anybody lays out a document in, and deliberately not
 * flipped here. A builder that quietly accepted top-down coordinates would be
 * a builder that lies about the format it writes, and the first person to
 * debug a page against the specification would find every number upside down.
 * The layout that produces these works top-down and converts once, where the
 * conversion is visible.
 */
export type PdfItem =
  | {
      readonly kind: 'text';
      readonly xPt: number;
      readonly yPt: number;
      readonly sizePt: number;
      readonly font: ReportFont;
      /** Already proven writable. The builder has no way to refuse. */
      readonly text: WinAnsiText;
    }
  | {
      readonly kind: 'image';
      readonly xPt: number;
      readonly yPt: number;
      readonly widthPt: number;
      readonly heightPt: number;
      /** Index into the document's images. */
      readonly image: number;
    };

export interface PdfPageSpec {
  readonly widthPt: number;
  readonly heightPt: number;
  readonly items: readonly PdfItem[];
}

export interface PdfDocumentSpec {
  readonly pages: readonly PdfPageSpec[];
  readonly images: readonly PdfImageResource[];
}

export type PdfBuildResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | {
      readonly ok: false;
      readonly reason: 'unrepresentable-character';
      readonly character: string;
      /** Already proven writable. The builder has no way to refuse. */
      readonly text: WinAnsiText;
    };

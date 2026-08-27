import type { ReportFont } from './pdf-text.constants';
import type { WinAnsiText } from './winansi.utils';

export interface ReportLine {
  readonly text: string;
  readonly sizePt: number;
  readonly font: ReportFont;
  /** Distance from the left text edge, for a rule's detail lines. */
  readonly indentPt: number;
}

/**
 * A run of lines that must stay together on one page.
 *
 * Atomic by design. A rule split across a page break — its label at the foot
 * of one page and the thing to do about it at the head of the next — is how a
 * reader comes away having read the finding and not the remedy.
 */
export interface ReportTextBlock {
  readonly kind: 'text';
  readonly lines: readonly ReportLine[];
  readonly spaceAfterPt: number;
}

export interface ReportImageBlock {
  readonly kind: 'image';
  readonly image: number;
  readonly widthPt: number;
  readonly heightPt: number;
  readonly spaceAfterPt: number;
}

export type ReportBlock = ReportTextBlock | ReportImageBlock;

/**
 * The same blocks with every line proven writable.
 *
 * A separate type rather than a flag, so the paginator cannot be handed
 * unencoded text — it takes lines that already carry their bytes, which is
 * what leaves it with no lookup to fail and no absent-text branch that nothing
 * could ever take.
 */
export interface EncodedReportLine extends Omit<ReportLine, 'text'> {
  readonly text: WinAnsiText;
}

export interface EncodedReportTextBlock {
  readonly kind: 'text';
  readonly lines: readonly EncodedReportLine[];
  readonly spaceAfterPt: number;
}

export type EncodedReportBlock = EncodedReportTextBlock | ReportImageBlock;

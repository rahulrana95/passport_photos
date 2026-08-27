import { buildPdfDocument } from '@/pdf/pdf-document';
import { encodeBlocks } from './encode-blocks.utils';
import { paginate } from './paginate.utils';
import { buildReportBlocks } from './report-blocks';
import type { ReportSubject } from './report-blocks';

export type ReportResult =
  | { readonly ok: true; readonly pdf: Uint8Array; readonly pages: number }
  | {
      readonly ok: false;
      readonly reason: 'unwritable-character';
      /** The character no font in this document can carry. */
      readonly character: string;
      /** The line it appeared in, so the copy can be found and changed. */
      readonly text: string;
    };

/**
 * The compliance report, as a document somebody can file.
 *
 * WHY IT EXISTS AT ALL: a photograph is submitted to a person or a system that
 * may disagree with us. When that happens the reader needs to be able to say
 * what was checked, against which published requirement, on what date — and to
 * point at the page it came from. A screen full of green ticks is not
 * evidence; this is.
 *
 * The encoding of every line happens FIRST, before a single byte of PDF is
 * written. That ordering is the whole error-handling design: the report is set
 * in a font nobody has to embed, which buys a document of a few kilobytes and
 * costs a Latin-only repertoire, and the day a locale ships a character
 * outside it this refuses rather than writing a black diamond into an
 * official-looking document. A report that renders a rule as garbage is worse
 * than one that failed to build — the first gets printed and handed to
 * somebody.
 */
export const buildComplianceReport = (subject: ReportSubject): ReportResult => {
  const encoded = encodeBlocks(buildReportBlocks(subject));
  if (!encoded.ok) {
    return {
      ok: false,
      reason: 'unwritable-character',
      character: encoded.character,
      text: encoded.source,
    };
  }

  const pages = paginate(encoded.blocks);

  return {
    ok: true,
    pdf: buildPdfDocument({
      pages,
      images: subject.photo === undefined ? [] : [subject.photo],
    }),
    pages: pages.length,
  };
};

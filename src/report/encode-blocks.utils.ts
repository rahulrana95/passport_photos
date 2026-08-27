import { encodeWinAnsi } from './winansi.utils';
import type {
  EncodedReportBlock,
  EncodedReportLine,
  ReportBlock,
} from './report-block.types';
import type { WinAnsiBatchRefusal } from './winansi.utils';

export type EncodedBlocksResult =
  | { readonly ok: true; readonly blocks: readonly EncodedReportBlock[] }
  | WinAnsiBatchRefusal;

/**
 * Proves every line writable before any of the document is built.
 *
 * All of it up front, deliberately. Encoding lazily as pages are laid out
 * would mean discovering an unwritable character halfway through a document
 * and having to decide what to do with the half already written; doing it here
 * means the only two outcomes are a complete report and a refusal that names
 * the line to fix.
 */
export const encodeBlocks = (blocks: readonly ReportBlock[]): EncodedBlocksResult => {
  const encoded: EncodedReportBlock[] = [];

  for (const block of blocks) {
    if (block.kind === 'image') {
      encoded.push(block);
      continue;
    }

    const lines: EncodedReportLine[] = [];
    for (const line of block.lines) {
      const text = encodeWinAnsi(line.text);
      if (!text.ok) return { ...text, source: line.text };
      lines.push({ ...line, text: text.value });
    }

    encoded.push({ kind: 'text', lines, spaceAfterPt: block.spaceAfterPt });
  }

  return { ok: true, blocks: encoded };
};

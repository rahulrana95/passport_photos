import { describe, expect, it } from 'vitest';
import { encodeBlocks } from './encode-blocks.utils';
import { MARGIN_PT, PAGE_HEIGHT_PT, PAGE_WIDTH_PT, paginate } from './paginate.utils';
import type { EncodedReportBlock, ReportBlock } from './report-block.types';

const encoded = (blocks: readonly ReportBlock[]): readonly EncodedReportBlock[] => {
  const result = encodeBlocks(blocks);
  if (!result.ok) throw new Error('The fixture text must be writable.');
  return result.blocks;
};

const paragraph = (label: string, lineCount = 1): ReportBlock => ({
  kind: 'text',
  lines: Array.from({ length: lineCount }, (_unused, index) => ({
    text: `${label} ${index}`,
    sizePt: 10,
    font: 'Helvetica' as const,
    indentPt: 0,
  })),
  spaceAfterPt: 6,
});

describe('flowing blocks down pages', () => {
  it('puts a short document on one page', () => {
    const pages = paginate(encoded([paragraph('a'), paragraph('b')]));

    expect(pages).toHaveLength(1);
  });

  it('gives every page the same size', () => {
    const pages = paginate(encoded([paragraph('a')]));

    expect(pages[0]?.widthPt).toBeCloseTo(PAGE_WIDTH_PT, 6);
    expect(pages[0]?.heightPt).toBeCloseTo(PAGE_HEIGHT_PT, 6);
  });

  it('starts a new page when the next block will not fit', () => {
    // A long list of failures is the case this exists for: a photograph that
    // gets everything wrong produces more rules than a page holds.
    const many = Array.from({ length: 60 }, (_unused, index) => paragraph(`rule ${index}`, 3));

    expect(paginate(encoded(many)).length).toBeGreaterThan(1);
  });

  it('never splits a block across the break', () => {
    // A rule's finding at the foot of one page and the thing to do about it at
    // the head of the next is how a reader comes away having read the problem
    // and not the remedy.
    const many = Array.from({ length: 60 }, (_unused, index) => paragraph(`rule ${index}`, 3));
    const pages = paginate(encoded(many));

    for (const page of pages) {
      // Every block contributes three lines, so a page split mid-block would
      // leave a count that is not a multiple of three.
      expect(page.items.length % 3).toBe(0);
    }
  });

  it('keeps everything inside the margins', () => {
    const pages = paginate(encoded(Array.from({ length: 40 }, () => paragraph('rule', 2))));

    for (const page of pages) {
      for (const item of page.items) {
        expect(item.xPt).toBeGreaterThanOrEqual(MARGIN_PT);
        expect(item.yPt).toBeGreaterThan(0);
        expect(item.yPt).toBeLessThanOrEqual(PAGE_HEIGHT_PT - MARGIN_PT);
      }
    }
  });

  it('reads downward, so later lines sit lower', () => {
    // The one place in the product that knows a PDF counts upward from the
    // bottom of the page.
    const pages = paginate(encoded([paragraph('a', 3)]));
    const [first, second] = pages[0]?.items ?? [];

    expect(first?.yPt ?? 0).toBeGreaterThan(second?.yPt ?? 0);
  });

  it('places an image by its bottom-left corner', () => {
    const pages = paginate(
      encoded([{ kind: 'image', image: 0, widthPt: 100, heightPt: 140, spaceAfterPt: 8 }]),
    );
    const [item] = pages[0]?.items ?? [];

    expect(item?.kind).toBe('image');
    expect(item?.yPt).toBeCloseTo(PAGE_HEIGHT_PT - MARGIN_PT - 140, 6);
  });

  it('places a block taller than a page rather than losing it', () => {
    // Nothing this report contains is that tall, but a block that silently
    // vanished would be a finding the reader never sees.
    const pages = paginate(encoded([paragraph('tall', 200)]));

    expect(pages[0]?.items).toHaveLength(200);
  });

  it('produces one empty page for an empty document', () => {
    expect(paginate([])).toEqual([
      { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT, items: [] },
    ]);
  });
});

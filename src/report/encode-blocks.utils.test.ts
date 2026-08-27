import { describe, expect, it } from 'vitest';
import { encodeBlocks } from './encode-blocks.utils';
import type { ReportBlock } from './report-block.types';

const text = (...lines: readonly string[]): ReportBlock => ({
  kind: 'text',
  lines: lines.map((line) => ({ text: line, sizePt: 10, font: 'Helvetica', indentPt: 0 })),
  spaceAfterPt: 4,
});

const image: ReportBlock = {
  kind: 'image',
  image: 0,
  widthPt: 100,
  heightPt: 140,
  spaceAfterPt: 8,
};

describe('proving a document writable before writing any of it', () => {
  it('encodes every line', () => {
    const result = encodeBlocks([text('Head height', 'Eye position')]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [block] = result.blocks;
    expect(block?.kind === 'text' && block.lines.map((line) => line.text.source)).toEqual([
      'Head height',
      'Eye position',
    ]);
  });

  it('passes images through untouched', () => {
    const result = encodeBlocks([image]);

    expect(result.ok && result.blocks[0]).toBe(image);
  });

  it('keeps the layout it was given', () => {
    const result = encodeBlocks([text('one')]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [block] = result.blocks;
    expect(block?.spaceAfterPt).toBe(4);
    expect(block?.kind === 'text' && block.lines[0]?.indentPt).toBe(0);
  });

  it('refuses the whole document for one unwritable character', () => {
    // All of it up front. Encoding lazily as pages are laid out would mean
    // discovering the problem halfway through and having to decide what to do
    // with the half already written.
    const result = encodeBlocks([text('fine'), text('\u65e5\u672c'), text('also fine')]);

    expect(result.ok).toBe(false);
  });

  it('names the character and the line it was in', () => {
    const result = encodeBlocks([text('Head height \u2705')]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.character).toBe('\u2705');
    expect(result.source).toBe('Head height \u2705');
  });

  it('has nothing to say about an empty document', () => {
    expect(encodeBlocks([])).toEqual({ ok: true, blocks: [] });
  });
});

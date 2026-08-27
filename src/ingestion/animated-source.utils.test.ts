import { describe, expect, it } from 'vitest';
import { GIF_TAG, PNG_SIGNATURE, RIFF_TAG, WEBP_FORM_TAG } from './image-format.constants';
import { isAnimatedSource } from './animated-source.utils';

const ascii = (text: string): number[] => [...text].map((character) => character.charCodeAt(0));

const bigEndian32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];

const littleEndian32 = (value: number): number[] => bigEndian32(value).reverse();

/**
 * A GIF, built block by block.
 *
 * `frames` image descriptors, each with its own data sub-blocks, so the walk
 * has to be correct rather than lucky — and the data deliberately contains
 * 0x2C, the image separator byte, which is what defeats a naive count.
 */
const COLOUR_TABLE_FLAG = 0x80;
/** Three bytes a colour, and the smallest table a GIF may declare is two. */
const SMALLEST_COLOUR_TABLE = [0, 0, 0, 0xff, 0xff, 0xff];

const gif = (
  frames: number,
  options: { readonly withExtension?: boolean; readonly withColourTables?: boolean } = {},
): Uint8Array => {
  const tabled = options.withColourTables === true;
  const bytes: number[] = [
    ...ascii(GIF_TAG),
    ...ascii('89a'),
    // Logical screen descriptor: 1x1, with a global colour table only when
    // asked for. Its size is declared in the packed field's low three bits.
    1, 0, 1, 0, tabled ? COLOUR_TABLE_FLAG : 0x00, 0, 0,
  ];

  if (tabled) bytes.push(...SMALLEST_COLOUR_TABLE);

  if (options.withExtension === true) {
    // A graphic control extension, whose payload also contains 0x2c.
    bytes.push(0x21, 0xf9, 4, 0x04, 0x2c, 0x00, 0x00, 0x00);
  }

  for (let frame = 0; frame < frames; frame += 1) {
    bytes.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, tabled ? COLOUR_TABLE_FLAG : 0x00);
    if (tabled) bytes.push(...SMALLEST_COLOUR_TABLE);
    // LZW minimum code size, one sub-block containing an image separator byte,
    // then the block terminator.
    bytes.push(2, 3, 0x2c, 0x2c, 0x2c, 0);
  }

  bytes.push(0x3b);
  return new Uint8Array(bytes);
};

/** A PNG whose chunks are walked in order. */
const png = (chunks: readonly { readonly type: string; readonly payload: number[] }[]): Uint8Array => {
  const bytes: number[] = [...PNG_SIGNATURE];

  for (const chunk of chunks) {
    bytes.push(...bigEndian32(chunk.payload.length), ...ascii(chunk.type), ...chunk.payload);
    // A CRC, whose value nothing here reads but whose four bytes must be
    // stepped over or every later chunk is misread.
    bytes.push(0, 0, 0, 0);
  }

  return new Uint8Array(bytes);
};

/** A RIFF/WebP container. */
const webp = (chunks: readonly { readonly type: string; readonly payload: number[] }[]): Uint8Array => {
  const body: number[] = [...ascii(WEBP_FORM_TAG)];

  for (const chunk of chunks) {
    body.push(...ascii(chunk.type), ...littleEndian32(chunk.payload.length), ...chunk.payload);
    if (chunk.payload.length % 2 === 1) body.push(0);
  }

  return new Uint8Array([...ascii(RIFF_TAG), ...littleEndian32(body.length), ...body]);
};

describe('GIF', () => {
  it('reports a single-frame GIF as a still', () => {
    expect(isAnimatedSource(gif(1), 'gif')).toBe(false);
  });

  it('reports a two-frame GIF as animated', () => {
    expect(isAnimatedSource(gif(2), 'gif')).toBe(true);
  });

  it('is not fooled by an image separator inside compressed data', () => {
    // 0x2C occurs constantly inside LZW output. Counting occurrences of it
    // would call almost every still GIF an animation, and refusing a good
    // photograph is the expensive direction to be wrong in.
    expect(isAnimatedSource(gif(1), 'gif')).toBe(false);
  });

  it('steps over an extension block to reach the frames behind it', () => {
    expect(isAnimatedSource(gif(2, { withExtension: true }), 'gif')).toBe(true);
  });

  it('reports a still even with an extension block in front of it', () => {
    expect(isAnimatedSource(gif(1, { withExtension: true }), 'gif')).toBe(false);
  });

  it('stops at the trailer rather than reading past the end', () => {
    const truncated = gif(1).subarray(0, gif(1).length - 1);

    expect(isAnimatedSource(truncated, 'gif')).toBe(false);
  });

  it('steps over the colour tables a real GIF carries', () => {
    // Almost every GIF in the world has a global palette, and most frames
    // carry a local one. Their bytes are not blocks; walking into them reads
    // palette entries as introducers, and the answer after that is noise.
    expect(isAnimatedSource(gif(2, { withColourTables: true }), 'gif')).toBe(true);
    expect(isAnimatedSource(gif(1, { withColourTables: true }), 'gif')).toBe(false);
  });

  it('stops when the sub-blocks run off the end of a truncated file', () => {
    // A sub-block header promising more bytes than the file holds. A partly
    // transferred GIF does this, and the walk must end rather than spin.
    const whole = gif(1);
    const cut = whole.subarray(0, whole.length - 4);

    expect(isAnimatedSource(cut, 'gif')).toBe(false);
  });

  it('stops at a byte that introduces nothing it knows', () => {
    // Neither a trailer, an extension nor an image separator. A corrupted or
    // mis-sniffed file lands here, and the answer must be "still" rather than
    // a walk that reads whatever follows as block structure.
    const junk = new Uint8Array([...ascii(GIF_TAG), ...ascii('89a'), 1, 0, 1, 0, 0, 0, 0, 0x99]);

    expect(isAnimatedSource(junk, 'gif')).toBe(false);
  });

  it('gives up on bytes that are not a GIF body at all', () => {
    expect(isAnimatedSource(new Uint8Array([...ascii(GIF_TAG), ...ascii('89a')]), 'gif')).toBe(false);
  });
});

describe('PNG', () => {
  it('reports a plain PNG as a still', () => {
    expect(isAnimatedSource(png([{ type: 'IHDR', payload: [0] }, { type: 'IDAT', payload: [0] }]), 'png')).toBe(false);
  });

  it('reports an APNG as animated', () => {
    const apng = png([
      { type: 'IHDR', payload: [0] },
      { type: 'acTL', payload: [0, 0, 0, 2, 0, 0, 0, 0] },
      { type: 'IDAT', payload: [0] },
    ]);

    expect(isAnimatedSource(apng, 'png')).toBe(true);
  });

  it('stops at the image data, which is where the specification says to stop', () => {
    // Also means it never reads the megabytes that follow.
    const trailing = png([
      { type: 'IHDR', payload: [0] },
      { type: 'IDAT', payload: [0] },
      { type: 'acTL', payload: [0, 0, 0, 2, 0, 0, 0, 0] },
    ]);

    expect(isAnimatedSource(trailing, 'png')).toBe(false);
  });

  it('is not fooled by the letters acTL inside a chunk payload', () => {
    const decoy = png([
      { type: 'IHDR', payload: ascii('acTL') },
      { type: 'IDAT', payload: [0] },
    ]);

    expect(isAnimatedSource(decoy, 'png')).toBe(false);
  });

  it('does not walk backwards on a chunk length above two gigabytes', () => {
    // A shift would make this negative and send the reader back through the
    // file for as long as the loop allowed.
    const huge = png([{ type: 'IHDR', payload: [] }]);
    huge.set(bigEndian32(0xff_ff_ff_ff), 8);

    expect(isAnimatedSource(huge, 'png')).toBe(false);
  });

  it('gives up on a truncated file', () => {
    expect(isAnimatedSource(new Uint8Array(PNG_SIGNATURE), 'png')).toBe(false);
  });
});

describe('WebP', () => {
  it('reports a plain WebP as a still', () => {
    expect(isAnimatedSource(webp([{ type: 'VP8 ', payload: [0] }]), 'webp')).toBe(false);
  });

  it('reports an ANIM chunk as animated', () => {
    expect(isAnimatedSource(webp([{ type: 'ANIM', payload: [0, 0, 0, 0, 0, 0] }]), 'webp')).toBe(true);
  });

  it('reads the animation flag out of an extended header', () => {
    const flagged = webp([{ type: 'VP8X', payload: [0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]);

    expect(isAnimatedSource(flagged, 'webp')).toBe(true);
  });

  it('leaves an extended header without the flag alone', () => {
    const still = webp([{ type: 'VP8X', payload: [0x10, 0, 0, 0, 0, 0, 0, 0, 0, 0] }]);

    expect(isAnimatedSource(still, 'webp')).toBe(false);
  });

  it('steps over an odd-length chunk without losing alignment', () => {
    // RIFF pads to an even length. Forgetting the pad byte walks the reader
    // half a step out for the rest of the file, and every later chunk name is
    // then read from the wrong offset.
    const padded = webp([
      { type: 'ICCP', payload: [1, 2, 3] },
      { type: 'ANIM', payload: [0, 0, 0, 0, 0, 0] },
    ]);

    expect(isAnimatedSource(padded, 'webp')).toBe(true);
  });

  it('gives up on a truncated container', () => {
    expect(isAnimatedSource(new Uint8Array(ascii(RIFF_TAG)), 'webp')).toBe(false);
  });
});

describe('formats that cannot hold an animation', () => {
  it.each(['jpeg', 'bmp', 'heic', 'avif', 'tiff'] as const)('reports %s as a still', (format) => {
    // Asking the question of a JPEG would be a walk that always returns the
    // same answer, so it is not asked.
    expect(isAnimatedSource(new Uint8Array([0xff, 0xd8, 0xff]), format)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { FORMAT_SNIFF_BYTES, JPEG_SIGNATURE } from '@/ingestion/image-format.constants';
import { readFileHeader } from './read-header.utils';

const OVERSIZED_BYTES = FORMAT_SNIFF_BYTES * 4;

describe('readFileHeader', () => {
  it('reads only the sniffing window, however large the file is', async () => {
    const body = new Uint8Array(OVERSIZED_BYTES).map((_, index) => index);

    const header = await readFileHeader(new Blob([body]));

    expect(header).toHaveLength(FORMAT_SNIFF_BYTES);
  });

  it('returns the leading bytes unchanged, so the format sniffer sees the real signature', async () => {
    const body = new Uint8Array(OVERSIZED_BYTES);
    body.set(JPEG_SIGNATURE, 0);

    const header = await readFileHeader(new Blob([body]));

    expect([...header.slice(0, JPEG_SIGNATURE.length)]).toEqual([...JPEG_SIGNATURE]);
  });

  it('returns what there is when the file is shorter than the window', async () => {
    // Not padded to the window length. A short file is a real case — the empty
    // and truncated ones — and padding would hand the sniffer bytes the file
    // does not contain.
    const header = await readFileHeader(new Blob([new Uint8Array(JPEG_SIGNATURE)]));

    expect(header).toHaveLength(JPEG_SIGNATURE.length);
  });

  it('returns nothing for an empty file rather than throwing', async () => {
    expect(await readFileHeader(new Blob([]))).toHaveLength(0);
  });
});

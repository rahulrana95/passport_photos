import { describe, expect, it } from 'vitest';
import { MM_PER_INCH, POINTS_PER_INCH } from '@/constants/measurement.constants';
import { buildJpegPdf, millimetresToPoints } from './image-page.utils';

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x0a, 0xff, 0xd9]);

const PAGE = {
  jpeg: JPEG,
  imageWidthPx: 1200,
  imageHeightPx: 1800,
  pageWidthMm: 101.6,
  pageHeightMm: 152.4,
};

const source = (pdf: Uint8Array): string => String.fromCharCode(...pdf);

describe('converting to the unit a PDF measures in', () => {
  it('turns an inch into seventy-two points', () => {
    expect(millimetresToPoints(MM_PER_INCH)).toBeCloseTo(POINTS_PER_INCH, 10);
  });
});

describe('a sheet as a single page', () => {
  const pdf = buildJpegPdf(PAGE);
  const text = source(pdf);

  it('is one page of the sheet’s physical size', () => {
    // The only number in the file a ruler can disagree with. A print dialogue
    // set to 100% has to produce photographs the size the specification asks
    // for.
    const width = millimetresToPoints(101.6).toFixed(3);
    const height = millimetresToPoints(152.4).toFixed(3);

    expect(text).toContain(`/MediaBox [0 0 ${width} ${height}]`);
    expect(text).toContain('/Count 1');
  });

  it('fills the page with the image exactly', () => {
    const width = millimetresToPoints(101.6).toFixed(3);

    expect(text).toContain(`${width} 0 0 `);
    expect(text).toContain('/Im0 Do');
  });

  it('carries the photograph as JPEG, at its pixel size', () => {
    expect(text).toContain('/Filter /DCTDecode');
    expect(text).toContain('/Width 1200 /Height 1800');
  });

  it('adds no text of its own', () => {
    // The sheet raster already carries the photographs where they belong. A
    // second coordinate system to get wrong is a second coordinate system to
    // get wrong.
    expect(text).not.toContain(' Tj');
  });
});

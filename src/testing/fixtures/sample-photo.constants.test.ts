import { describe, expect, it } from 'vitest';
import {
  SAMPLE_PHOTO_DARK,
  SAMPLE_PHOTO_HEIGHT_PX,
  SAMPLE_PHOTO_LIGHT,
  SAMPLE_PHOTO_SUBJECT,
  SAMPLE_PHOTO_WIDTH_PX,
} from './sample-photo.constants';

const decoded = (uri: string): string => decodeURIComponent(uri.split(',')[1] ?? '');

describe('the stand-in photograph', () => {
  it.each([
    ['light', SAMPLE_PHOTO_LIGHT],
    ['dark', SAMPLE_PHOTO_DARK],
  ])('draws the %s variant at the declared size', (_name, uri) => {
    expect(decoded(uri)).toContain(
      `width="${SAMPLE_PHOTO_WIDTH_PX}" height="${SAMPLE_PHOTO_HEIGHT_PX}"`,
    );
  });

  it('is a data URI an <img> can load directly', () => {
    expect(SAMPLE_PHOTO_LIGHT.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  });

  it('draws the two variants at genuinely different lightness', () => {
    // The pair exists to prove the annotations survive both. Two fixtures that
    // drifted to similar tones would still render, and the contrast story
    // would quietly stop testing anything.
    expect(decoded(SAMPLE_PHOTO_LIGHT)).not.toBe(decoded(SAMPLE_PHOTO_DARK));
    expect(decoded(SAMPLE_PHOTO_LIGHT)).toContain('#eef0ef');
    expect(decoded(SAMPLE_PHOTO_DARK)).toContain('#232527');
  });
});

describe('the landmarks that go with it', () => {
  const { crop, chinY, crownY, eyeY, faceMidlineX } = SAMPLE_PHOTO_SUBJECT;

  it('places the head inside the frame', () => {
    expect(crownY ?? 0).toBeGreaterThan(0);
    expect(chinY).toBeLessThan(SAMPLE_PHOTO_HEIGHT_PX);
  });

  it('puts the crown above the eyes and the eyes above the chin', () => {
    // Hand-placed to match the drawing, so a mark in the wrong place lands
    // somewhere obviously wrong on the face rather than plausibly near it.
    expect(crownY ?? 0).toBeLessThan(eyeY);
    expect(eyeY).toBeLessThan(chinY);
  });

  it('keeps the crop inside the photograph', () => {
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.widthPx).toBeLessThanOrEqual(SAMPLE_PHOTO_WIDTH_PX);
    expect(crop.y + crop.heightPx).toBeLessThanOrEqual(SAMPLE_PHOTO_HEIGHT_PX);
  });

  it('centres the face in the crop', () => {
    expect(faceMidlineX).toBe(crop.x + crop.widthPx / 2);
  });
});

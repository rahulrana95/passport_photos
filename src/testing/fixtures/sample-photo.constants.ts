import type { OverlaySubject } from '@/overlay/build-overlay';

/**
 * A stand-in photograph, drawn rather than photographed.
 *
 * No real face belongs in this repository. Every public face dataset is
 * licensed for research only, and a product whose entire promise is that
 * photographs never leave the reader's device has no business shipping
 * somebody else's face in its own source tree.
 *
 * An SVG data URI rather than a bitmap: it is deterministic to the pixel, so
 * the visual regression suite compares the overlay rather than a JPEG's
 * compression noise, and it is legible in a diff.
 */

export const SAMPLE_PHOTO_WIDTH_PX = 800;
export const SAMPLE_PHOTO_HEIGHT_PX = 1000;

interface SamplePhotoTones {
  readonly background: string;
  readonly skin: string;
  readonly hair: string;
  readonly clothing: string;
}

const drawSamplePhoto = (tones: SamplePhotoTones): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${SAMPLE_PHOTO_WIDTH_PX}" height="${SAMPLE_PHOTO_HEIGHT_PX}" viewBox="0 0 ${SAMPLE_PHOTO_WIDTH_PX} ${SAMPLE_PHOTO_HEIGHT_PX}">`,
      `<rect width="100%" height="100%" fill="${tones.background}"/>`,
      `<path d="M 180 1000 Q 400 720 620 1000 Z" fill="${tones.clothing}"/>`,
      `<ellipse cx="400" cy="330" rx="132" ry="176" fill="${tones.hair}"/>`,
      `<ellipse cx="400" cy="360" rx="112" ry="160" fill="${tones.skin}"/>`,
      `<ellipse cx="356" cy="330" rx="15" ry="9" fill="${tones.hair}"/>`,
      `<ellipse cx="444" cy="330" rx="15" ry="9" fill="${tones.hair}"/>`,
      `<path d="M 366 452 Q 400 470 434 452" stroke="${tones.hair}" stroke-width="6" fill="none"/>`,
      `</svg>`,
    ].join(''),
  )}`;

/** A photograph taken against a pale wall in good light. */
export const SAMPLE_PHOTO_LIGHT = drawSamplePhoto({
  background: '#eef0ef',
  skin: '#d8b294',
  hair: '#4a3b2f',
  clothing: '#6b7a86',
});

/**
 * The same framing, photographed dark throughout.
 *
 * Its whole job is to prove the annotations survive it. A white line on a pale
 * wall and a black line in dark hair each vanish, which is why every stroke in
 * this overlay is drawn twice.
 */
export const SAMPLE_PHOTO_DARK = drawSamplePhoto({
  background: '#232527',
  skin: '#4b3628',
  hair: '#141013',
  clothing: '#1b2429',
});

/**
 * Where the analysis found things in the drawing above.
 *
 * Written to match the shapes rather than measured from them: the sample is a
 * fixture, and hand-placing the landmarks is what makes the overlay's
 * correctness visible — a mark in the wrong place lands somewhere obviously
 * wrong on the face rather than plausibly near it.
 */
export const SAMPLE_PHOTO_SUBJECT: OverlaySubject = {
  crop: { x: 100, y: 80, widthPx: 600, heightPx: 600 },
  chinY: 520,
  crownY: 154,
  eyeY: 330,
  faceMidlineX: 400,
};

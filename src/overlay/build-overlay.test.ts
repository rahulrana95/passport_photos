import { describe, expect, it } from 'vitest';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { UK_PASSPORT } from '@/photo-spec/specs/uk.spec';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { buildOverlay } from './build-overlay';
import type { OverlaySubject } from './build-overlay';
import type { OverlayInstruction } from './overlay-instruction.types';

const NOW = new Date('2026-08-27T00:00:00Z');
const SPEC = resolveSpec(US_PASSPORT, NOW);
const CROP = { x: 100, y: 50, widthPx: 600, heightPx: 600 };
const PIXELS_PER_MM = CROP.heightPx / SPEC.print.heightMm;

const SUBJECT: OverlaySubject = {
  crop: CROP,
  chinY: 500,
  crownY: 150,
  eyeY: 300,
  faceMidlineX: 400,
};

const rolesOf = (instructions: readonly OverlayInstruction[]): string[] =>
  instructions.map((instruction) => instruction.role);

const only = (
  instructions: readonly OverlayInstruction[],
  kind: OverlayInstruction['kind'],
  role: string,
): OverlayInstruction[] =>
  instructions.filter(
    (instruction) => instruction.kind === kind && instruction.role === role,
  );

describe('what gets drawn', () => {
  const instructions = buildOverlay(SUBJECT, SPEC);

  it('draws the crop exactly where the geometry engine planned it', () => {
    // Taken, never re-derived. Recomputing a crop here would give a second
    // answer differing by a pixel, and a frame a pixel out is a frame that
    // does not line up with the photograph it is drawn on.
    expect(only(instructions, 'rect', 'crop')).toEqual([
      { kind: 'rect', role: 'crop', x: 100, y: 50, widthPx: 600, heightPx: 600 },
    ]);
  });

  it('paints the crop frame last, over everything else', () => {
    // Paint order is chosen, not incidental. The frame is the one mark that
    // says what will actually be printed, and a translucent band drawn over it
    // would soften the only line the reader needs to trust.
    expect(instructions.at(-1)?.role).toBe('crop');
  });

  it('shades a band before drawing the lines that bracket it', () => {
    const shadeIndex = instructions.findIndex((instruction) => instruction.kind === 'shade');
    const lineIndex = instructions.findIndex(
      (instruction) => instruction.kind === 'line' && instruction.role === 'head-band',
    );

    expect(shadeIndex).toBeLessThan(lineIndex);
  });

  it('places the permitted head band by measuring up from the chin', () => {
    // The chin is the landmark we are most confident in, and a specification
    // states a head height rather than a crown position — so the band is
    // derived the way the requirement is written.
    const [shade] = only(instructions, 'shade', 'head-band');

    expect(shade).toMatchObject({
      x: CROP.x,
      widthPx: CROP.widthPx,
      y: SUBJECT.chinY - SPEC.headHeight.maxMm * PIXELS_PER_MM,
    });
  });

  it('brackets the head band with a line at each edge', () => {
    const lines = only(instructions, 'line', 'head-band');

    expect(lines).toHaveLength(2);
  });

  it('measures crown to chin down the side rather than across the face', () => {
    // A dimension line over the face covers the thing being measured, and the
    // first question anybody asks of an annotated photo is whether the marks
    // are hiding something.
    const [span] = only(instructions, 'span', 'head-span');

    expect(span).toMatchObject({ fromY: SUBJECT.crownY, toY: SUBJECT.chinY });
    expect(span?.kind === 'span' ? span.x : 0).toBeLessThan(SUBJECT.faceMidlineX);
    expect(span?.kind === 'span' ? span.x : 0).toBeGreaterThan(CROP.x);
  });

  it('draws the eye line where the eyes actually are', () => {
    const [line] = only(instructions, 'line', 'eye-line');

    expect(line).toMatchObject({ fromY: SUBJECT.eyeY, toY: SUBJECT.eyeY });
  });

  it('draws the centre line down the middle of the crop', () => {
    const [line] = only(instructions, 'line', 'centre-line');

    expect(line).toMatchObject({ fromX: 400, toX: 400, fromY: CROP.y, toY: CROP.y + CROP.heightPx });
  });

  it('places the eye band measured up from the bottom edge', () => {
    const [shade] = only(instructions, 'shade', 'eye-band');
    const bottom = CROP.y + CROP.heightPx;

    expect(shade).toMatchObject({
      y: bottom - SPEC.eyeLine!.maxFromBottomMm * PIXELS_PER_MM,
      heightPx:
        (SPEC.eyeLine!.maxFromBottomMm - SPEC.eyeLine!.minFromBottomMm) * PIXELS_PER_MM,
    });
  });
});

describe('what is left out, and why', () => {
  it('omits the crown measure when segmentation could not find a crown', () => {
    // Absent rather than guessed. A dimension line drawn to a crown we never
    // located is a measurement presented with the same confidence as one we
    // took.
    const instructions = buildOverlay({ ...SUBJECT, crownY: undefined }, SPEC);

    expect(rolesOf(instructions)).not.toContain('head-span');
  });

  it('still shows where the head must reach when the crown is unknown', () => {
    // Where the head SHOULD come to is a property of the specification, and it
    // is known whether or not we found the head. Dropping it would leave the
    // reader with no idea what they are aiming for.
    const instructions = buildOverlay({ ...SUBJECT, crownY: undefined }, SPEC);

    expect(rolesOf(instructions)).toContain('head-band');
  });

  it('omits the eye band for a country that publishes no eye rule', () => {
    // Drawing a permitted range for a rule nobody wrote puts a limit on the
    // photograph that no official will ever apply to it.
    const instructions = buildOverlay(SUBJECT, resolveSpec(UK_PASSPORT, NOW));

    expect(rolesOf(instructions)).not.toContain('eye-band');
  });

  it('still marks the eye line itself where no band is published', () => {
    const instructions = buildOverlay(SUBJECT, resolveSpec(UK_PASSPORT, NOW));

    expect(rolesOf(instructions)).toContain('eye-line');
  });
});

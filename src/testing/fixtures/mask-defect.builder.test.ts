import { describe, expect, it } from 'vitest';
import {
  addBlob,
  addHole,
  addSpeckle,
  BASE_MASK_SPEC,
  buildHeadMask,
  erodeEdge,
} from './mask-defect.builder';
import { isSubject } from '@/analysis/mask-cleanup.utils';

describe('buildHeadMask', () => {
  it('puts the crown where it was asked to', () => {
    const mask = buildHeadMask();

    expect(isSubject(mask, BASE_MASK_SPEC.centreX, BASE_MASK_SPEC.crownY + 2)).toBe(true);
    expect(isSubject(mask, BASE_MASK_SPEC.centreX, BASE_MASK_SPEC.crownY - 4)).toBe(false);
  });

  it('joins the head to the shoulders through a neck', () => {
    // A head alone is separable by any algorithm. A head joined to a torso is
    // what a real mask looks like, and it is what makes finding the top of the
    // head harder than finding the top of the mask.
    const midNeck = (BASE_MASK_SPEC.chinY + BASE_MASK_SPEC.shouldersY) / 2;

    expect(isSubject(buildHeadMask(), BASE_MASK_SPEC.centreX, Math.round(midNeck))).toBe(true);
  });

  it('is deterministic', () => {
    expect([...buildHeadMask().data]).toEqual([...buildHeadMask().data]);
  });

  it('renders no head when it has been given no height', () => {
    // Sampled well outside the neck, which is drawn separately and would
    // otherwise cover the midline and hide whether the head rendered at all.
    const mask = buildHeadMask({ crownY: 100, chinY: 100, shouldersY: 400 });
    const besideTheNeck = BASE_MASK_SPEC.centreX + BASE_MASK_SPEC.headWidthPx / 3;

    expect(isSubject(mask, Math.round(besideTheNeck), 100)).toBe(false);
  });
});

describe('defects', () => {
  it('leaves the original untouched', () => {
    // Every defect returns a copy. Mutating in place would make one test's
    // fixture depend on whether another ran first.
    const original = buildHeadMask();
    const before = [...original.data];

    addSpeckle(original, 100, 3);
    addHole(original, 10, 10, 5, 5);
    addBlob(original, 20, 20, 5);
    erodeEdge(original, 1);

    expect([...original.data]).toEqual(before);
  });

  it('clips a blob that falls partly outside the frame', () => {
    expect(() => addBlob(buildHeadMask(), 2, 2, 20)).not.toThrow();
  });

  it('clips a hole that runs past the frame edge', () => {
    expect(() => addHole(buildHeadMask(), 290, 390, 40, 40)).not.toThrow();
  });

  it('adds speckle only to background', () => {
    const speckled = addSpeckle(buildHeadMask(), 500, 11);
    const plain = buildHeadMask();

    for (let index = 0; index < plain.data.length; index += 1) {
      if ((plain.data[index] ?? 0) > 0) expect(speckled.data[index]).toBe(plain.data[index]);
    }
  });

  it('erodes the outline inward', () => {
    const eroded = erodeEdge(buildHeadMask(), 2);

    expect(isSubject(eroded, BASE_MASK_SPEC.centreX, BASE_MASK_SPEC.crownY + 1)).toBe(false);
    expect(isSubject(eroded, BASE_MASK_SPEC.centreX, BASE_MASK_SPEC.crownY + 20)).toBe(true);
  });
});

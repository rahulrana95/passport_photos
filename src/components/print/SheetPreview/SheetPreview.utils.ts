import { PERCENT_SCALE } from '@/constants/measurement.constants';
import type { CSSProperties } from 'react';
import type { SheetPlan, SheetSlot } from '@/sheet/sheet-layout.types';

/**
 * Places a slot on the preview as a share of the sheet.
 *
 * Percentages rather than pixels, so the preview is the same drawing at any
 * size on the page — the sheet is a physical object and the preview is a
 * picture of one, and the only thing that has to survive is the proportion.
 */
export const slotStyle = (plan: SheetPlan, slot: SheetSlot): CSSProperties => ({
  left: `${(slot.xMm / plan.sheet.widthMm) * PERCENT_SCALE}%`,
  top: `${(slot.yMm / plan.sheet.heightMm) * PERCENT_SCALE}%`,
  width: `${(plan.photo.widthMm / plan.sheet.widthMm) * PERCENT_SCALE}%`,
  height: `${(plan.photo.heightMm / plan.sheet.heightMm) * PERCENT_SCALE}%`,
});

/** Gives the preview the sheet's own proportions. */
export const sheetStyle = (plan: SheetPlan): CSSProperties =>
  ({ '--sheet-aspect': `${plan.sheet.widthMm} / ${plan.sheet.heightMm}` }) as CSSProperties;

/**
 * How the photograph sits in its slot.
 *
 * A quarter turn where the plan lays the photograph on its side, because the
 * preview has to show what will be printed — one showing every photograph
 * upright when half of them come out sideways is a preview that surprises
 * somebody at a counter.
 *
 * The turn needs the box turned with it. A slot holding a rotated photograph
 * is the photograph's own shape with its axes swapped, so the image is sized
 * to the OPPOSITE axis of the slot and then rotated into place: an image the
 * slot's shape, rotated, would stick out of it by exactly the difference
 * between the two.
 */
export const photoStyle = (plan: SheetPlan): CSSProperties => {
  if (!plan.rotated) return {};

  const ratio = plan.photo.heightMm / plan.photo.widthMm;

  return {
    position: 'absolute',
    inset: 0,
    margin: 'auto',
    width: `${ratio * PERCENT_SCALE}%`,
    height: `${(PERCENT_SCALE / ratio).toString()}%`,
    transform: 'rotate(90deg)',
  };
};

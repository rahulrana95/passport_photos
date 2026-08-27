import { HALF } from '@/measurement/angle.constants';
import type { PixelBuffer } from '@/testing/fixtures/synthetic-head.types';
import type { SourcePoint } from '@/geometry/geometry.types';
import { FACE_BOX_WIDTHS, FACE_BOX_ABOVE_EYES } from './face-region.constants';

export interface FaceBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/**
 * The part of the frame that is face, from the three landmarks there are.
 *
 * A BOX, and deliberately not the segmentation mask. The mask is the whole
 * SUBJECT — hair, shoulders, clothing — and exposure judged over that is a
 * judgement about somebody's jumper. Skin is what an official looks at and
 * what a clipped highlight ruins.
 *
 * Sized from the inter-ocular distance, which is the only scale the landmarks
 * give. The proportions are rough on purpose: this selects pixels to average,
 * not a boundary anything is measured against, and a box that is a little
 * generous is far better than one that clips the cheeks off a wide face.
 */
export const faceBoxOf = (
  leftEye: SourcePoint,
  rightEye: SourcePoint,
  chin: SourcePoint,
): FaceBox => {
  const interOcular = Math.abs(rightEye.x - leftEye.x);
  const centreX = (leftEye.x + rightEye.x) / HALF;
  const eyeY = (leftEye.y + rightEye.y) / HALF;
  const halfWidth = (interOcular * FACE_BOX_WIDTHS) / HALF;

  return {
    minX: centreX - halfWidth,
    maxX: centreX + halfWidth,
    minY: eyeY - interOcular * FACE_BOX_ABOVE_EYES,
    maxY: chin.y,
  };
};

/**
 * A membership test over a buffer, for the quality checks that take one.
 *
 * Takes the box in the buffer's OWN coordinates. Converting inside would mean
 * this function knew about scale factors, and the two callers that need it
 * work in different spaces.
 */
export const withinBox = (buffer: PixelBuffer, box: FaceBox) => (index: number): boolean => {
  const x = index % buffer.width;
  const y = Math.floor(index / buffer.width);

  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
};

/** The same box with every coordinate scaled, for moving between spaces. */
export const scaleBox = (box: FaceBox, factor: number): FaceBox => ({
  minX: box.minX * factor,
  minY: box.minY * factor,
  maxX: box.maxX * factor,
  maxY: box.maxY * factor,
});

import { HEAD_SPAN_CAP_RATIO, HEAD_SPAN_INSET_RATIO, HALF } from './overlay-layout.constants';
import type { CropRect } from '@/geometry/geometry.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { OverlayInstruction } from './overlay-instruction.types';

/**
 * Everything the overlay needs about the subject, in source pixels.
 *
 * A narrower thing than SubjectGeometry on purpose: the overlay draws what was
 * measured, and taking the measurement inputs would let it re-derive a crop and
 * disagree with the one the geometry engine actually planned. Two answers to
 * where the crop is, differing by a pixel, is a mark that does not line up with
 * the photo it is annotating.
 */
export interface OverlaySubject {
  readonly crop: CropRect;
  readonly chinY: number;
  /** Undefined when segmentation could not find the top of the head. */
  readonly crownY: number | undefined;
  readonly eyeY: number;
  readonly faceMidlineX: number;
}

/**
 * Builds the annotations for one analysed photograph.
 *
 * THE ARRAY ORDER IS THE PAINT ORDER, and it is chosen rather than incidental:
 * shaded bands first, then the lines that bracket them, then the measured
 * lines, then the crop frame last so nothing paints over the one mark that
 * tells the reader what will actually be printed.
 *
 * Where a measurement is missing, its annotations are absent rather than
 * guessed. A crown we could not find produces no crown-to-chin measure — the
 * permitted band is still drawn, because where the head SHOULD reach is a
 * property of the specification and is known whether or not we found the head.
 */
export const buildOverlay = (
  subject: OverlaySubject,
  spec: ResolvedPhotoSpec,
): readonly OverlayInstruction[] => {
  const { crop } = subject;
  const pixelsPerMm = crop.heightPx / spec.print.heightMm;
  const left = crop.x;
  const right = crop.x + crop.widthPx;
  const bottom = crop.y + crop.heightPx;

  const horizontal = (
    role: OverlayInstruction['role'],
    y: number,
  ): OverlayInstruction => ({ kind: 'line', role, fromX: left, fromY: y, toX: right, toY: y });

  // Where the crown is allowed to sit, measured up from the chin. Expressed
  // this way round because that is how a specification states it — a head
  // height, not a crown position — and because the chin is the landmark we are
  // most confident in.
  const headBandTop = subject.chinY - spec.headHeight.maxMm * pixelsPerMm;
  const headBandBottom = subject.chinY - spec.headHeight.minMm * pixelsPerMm;

  const headSpan: readonly OverlayInstruction[] =
    subject.crownY === undefined
      ? []
      : [
          {
            kind: 'span',
            role: 'head-span',
            x: left + crop.widthPx * HEAD_SPAN_INSET_RATIO,
            fromY: subject.crownY,
            toY: subject.chinY,
            capWidthPx: crop.widthPx * HEAD_SPAN_CAP_RATIO,
          },
        ];

  // The eye band exists only where the authority publishes one. Drawing a
  // permitted range for a rule nobody wrote would put a limit on the
  // photograph that no official will ever apply to it.
  const eyeBand: readonly OverlayInstruction[] =
    spec.eyeLine === undefined
      ? []
      : [
          {
            kind: 'shade',
            role: 'eye-band',
            x: left,
            y: bottom - spec.eyeLine.maxFromBottomMm * pixelsPerMm,
            widthPx: crop.widthPx,
            heightPx:
              (spec.eyeLine.maxFromBottomMm - spec.eyeLine.minFromBottomMm) * pixelsPerMm,
          },
          horizontal('eye-band', bottom - spec.eyeLine.maxFromBottomMm * pixelsPerMm),
          horizontal('eye-band', bottom - spec.eyeLine.minFromBottomMm * pixelsPerMm),
        ];

  return [
    {
      kind: 'shade',
      role: 'head-band',
      x: left,
      y: headBandTop,
      widthPx: crop.widthPx,
      heightPx: headBandBottom - headBandTop,
    },
    ...eyeBand,
    horizontal('head-band', headBandTop),
    horizontal('head-band', headBandBottom),
    ...headSpan,
    horizontal('eye-line', subject.eyeY),
    {
      kind: 'line',
      role: 'centre-line',
      fromX: crop.x + crop.widthPx / HALF,
      fromY: crop.y,
      toX: crop.x + crop.widthPx / HALF,
      toY: bottom,
    },
    { kind: 'rect', role: 'crop', x: crop.x, y: crop.y, widthPx: crop.widthPx, heightPx: crop.heightPx },
  ];
};

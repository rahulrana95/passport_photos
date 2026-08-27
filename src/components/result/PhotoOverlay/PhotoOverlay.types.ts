import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

export interface PhotoOverlayProps {
  /** Object URL of the photograph. It never leaves the device. */
  readonly imageSrc: string;
  readonly sourceWidthPx: number;
  readonly sourceHeightPx: number;
  readonly instructions: readonly OverlayInstruction[];
}

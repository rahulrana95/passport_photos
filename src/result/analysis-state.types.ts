import type { AnalysisErrorCode, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { ComplianceReport } from '@/rules/rule.types';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

/**
 * The photograph as it will be shown back, with its own annotations.
 *
 * ONE OBJECT, and that is the whole point of it. The source URL and the marks
 * drawn over it belong to the same photograph, so carrying them separately
 * would let a state update land half-applied and paint one photo's measurements
 * across another's face — a picture that is wrong in the most convincing
 * possible way, since every mark on it would look deliberate.
 *
 * The URL is an object URL. It never leaves the device, and whoever created it
 * owns revoking it.
 */
export interface PhotoPreview {
  readonly src: string;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly instructions: readonly OverlayInstruction[];
}

/**
 * Where an analysis has got to.
 *
 * A discriminated union rather than a bag of optional fields, because the
 * states are genuinely exclusive and the bag version is how a panel ends up
 * showing a progress bar over a stale result. Every field a state needs is
 * only reachable in that state.
 */
export type AnalysisState =
  | { readonly kind: 'idle' }
  | {
      readonly kind: 'analysing';
      readonly stage: AnalysisStage;
      /** 0–1 within the current stage, as the worker reports it. */
      readonly stageRatio: number;
    }
  | { readonly kind: 'failed'; readonly error: AnalysisErrorCode }
  | {
      readonly kind: 'ready';
      readonly report: ComplianceReport;
      /**
       * Undefined where nothing could be measured on the photograph, so there
       * is nothing to draw over it. The verdict still stands and still says
       * why — it is the annotation that has no content, not the answer.
       */
      readonly preview: PhotoPreview | undefined;
    };

import type { AnalysisErrorCode, AnalysisStage } from '@/analysis/analysis-protocol.types';
import type { ComplianceReport } from '@/rules/rule.types';

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
  | { readonly kind: 'ready'; readonly report: ComplianceReport };

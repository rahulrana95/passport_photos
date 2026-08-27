import type { AnalysisStage } from '@/analysis/analysis-protocol.types';

export interface AnalysisProgressProps {
  readonly stage: AnalysisStage;
  /** 0–1 within the current stage, as the worker reports it. */
  readonly stageRatio: number;
}

import { ANALYSIS_STAGES } from '@/analysis/analysis-protocol.types';
import type { AnalysisStage } from '@/analysis/analysis-protocol.types';

/**
 * How far along the whole analysis is, from the stage and the progress within it.
 *
 * Driven by the STAGE first and the ratio second, which is the whole point.
 * ANALYSIS_STAGES is ordered deliberately so a bar can be moved by the stage
 * alone, and on a slow device that is the only thing that moves: the segmenter
 * reports no intermediate ratio worth the name, so a bar reading the ratio
 * only would sit at zero for several seconds and read as a hang. Reaching a
 * new stage always advances the bar, whatever the model says about itself.
 *
 * The ratio is clamped rather than trusted. A worker reporting 1.4 would push
 * the bar past the end of its own stage and into the next one's territory,
 * making progress appear to jump backwards when that stage actually starts.
 */
export const analysisProgress = (stage: AnalysisStage, stageRatio: number): number => {
  const index = ANALYSIS_STAGES.indexOf(stage);
  const withinStage = Math.min(1, Math.max(0, stageRatio));

  return (index + withinStage) / ANALYSIS_STAGES.length;
};

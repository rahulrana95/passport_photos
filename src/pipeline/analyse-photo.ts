import { evaluateRules } from '@/rules/evaluate-rules';
import { buildRuleInput } from './build-rule-input';
import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { ComplianceReport } from '@/rules/rule.types';
import type { IngestedImage } from '@/ingestion/image-decoder.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface AnalysePhotoOptions {
  readonly image: IngestedImage;
  readonly result: AnalysisResult;
  readonly spec: ResolvedPhotoSpec;
}

/**
 * A decoded photograph and what the models found, turned into a verdict.
 *
 * Two lines, and that is the point: the measuring is buildRuleInput's job and
 * the judging is the engine's, and neither knows the other. What was missing
 * was not logic — it was anyone calling both.
 */
export const analysePhoto = (options: AnalysePhotoOptions): ComplianceReport =>
  evaluateRules(buildRuleInput(options), options.spec);

import type { AnalysisResult } from '@/analysis/analysis-protocol.types';
import type { ComplianceReport } from '@/rules/rule.types';
import type { IngestedImage } from '@/ingestion/image-decoder.types';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface AnalysePhotoOptions {
  readonly image: IngestedImage;
  readonly result: AnalysisResult;
  readonly spec: ResolvedPhotoSpec;
}

export interface AnalysedPhoto {
  readonly report: ComplianceReport;
  /** Undefined where nothing could be measured, so there is nothing to draw. */
  readonly overlay: readonly OverlayInstruction[] | undefined;
}

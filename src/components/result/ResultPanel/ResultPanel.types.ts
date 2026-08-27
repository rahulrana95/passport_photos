import type { AnalysisState } from '@/result/analysis-state.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

export interface ResultPanelProps {
  readonly state: AnalysisState;
  /**
   * Needed before there are any results, which is the point.
   *
   * The skeleton's row count is derived from it, so the loading state occupies
   * exactly the space the answer will. Without the specification the panel
   * would have to guess, and a guess is a layout shift.
   */
  readonly spec: ResolvedPhotoSpec;
  readonly onRetry?: (() => void) | undefined;
  /** Rendered under the verdict — the annotated photo and the downloads. */
  readonly children?: React.ReactNode;
}

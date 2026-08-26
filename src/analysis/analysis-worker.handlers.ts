import { AnalysisError, serialiseError } from './analysis-error.utils';
import type {
  AnalysisStage,
  Detector,
  WorkerRequest,
  WorkerResponse,
} from './analysis-protocol.types';

export type EmitResponse = (response: WorkerResponse) => void;

const STAGE_PROGRESS: Readonly<Record<AnalysisStage, number>> = {
  decoding: 0.1,
  'detecting-face': 0.35,
  segmenting: 0.7,
  measuring: 0.85,
  'checking-quality': 1,
};

/**
 * The worker's logic, extracted from the worker itself.
 *
 * A Worker cannot be instantiated in jsdom, so keeping the dispatch here as a
 * plain function is what makes any of this testable. The worker entry file is a
 * four-line shim around it.
 */
export const createRequestHandler = (
  detector: Detector,
  emit: EmitResponse,
): ((request: WorkerRequest) => Promise<void>) => {
  const cancelled = new Set<string>();

  const isCancelled = (id: string): boolean => cancelled.has(id);

  const report = (id: string, stage: AnalysisStage): void => {
    emit({ kind: 'progress', id, stage, ratio: STAGE_PROGRESS[stage] });
  };

  return async (request: WorkerRequest): Promise<void> => {
    if (request.kind === 'cancel') {
      cancelled.add(request.id);
      emit({ kind: 'cancelled', id: request.id });
      return;
    }

    const { id, payload } = request;

    try {
      report(id, 'decoding');
      if (isCancelled(id)) return;

      report(id, 'detecting-face');
      const landmarks = await detector.detectLandmarks(payload.buffer);
      // Checked after every await: a cancellation that arrives mid-analysis
      // must stop the work, not merely be ignored at the end.
      if (isCancelled(id)) return;

      if (landmarks === undefined) {
        throw new AnalysisError(
          'no-face-detected',
          'No face was found in this image. Make sure your whole head is in frame and try again.',
        );
      }

      report(id, 'segmenting');
      const segmentation = await detector.segment(payload.buffer);
      if (isCancelled(id)) return;

      report(id, 'checking-quality');
      emit({ kind: 'result', id, payload: { landmarks, segmentation } });
    } catch (error) {
      // A cancelled request must not also report an error: the caller has
      // already moved on, and a late rejection would surface as a spurious
      // failure on whatever they are looking at now.
      if (isCancelled(id)) return;
      emit({ kind: 'error', id, error: serialiseError(error) });
    } finally {
      cancelled.delete(id);
    }
  };
};

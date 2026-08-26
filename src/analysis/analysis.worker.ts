import { startAnalysisWorker } from './analysis-worker.bootstrap';
import { createDetector } from './detector.factory';
import type { WorkerScope } from './analysis-client.types';

startAnalysisWorker(globalThis as unknown as WorkerScope, createDetector());

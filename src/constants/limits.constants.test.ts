import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  ANALYSIS_WORKING_EDGE_PX,
  MAX_SOURCE_DIMENSION_PX,
  MAX_UPLOAD_BYTES,
  MIN_SOURCE_EDGE_PX,
  MODEL_LOAD_TIMEOUT_MS,
  WORKER_TASK_TIMEOUT_MS,
} from './limits.constants';

describe('operational limits', () => {
  it('keeps the analysis working size below the browser canvas ceiling', () => {
    expect(ANALYSIS_WORKING_EDGE_PX).toBeLessThan(MAX_SOURCE_DIMENSION_PX);
  });

  it('accepts a source smaller than the working size without contradiction', () => {
    expect(MIN_SOURCE_EDGE_PX).toBeLessThan(ANALYSIS_WORKING_EDGE_PX);
  });

  it('allows a real phone photo through', () => {
    const twelveMegapixelJpegBytes = 8 * 1024 * 1024;
    expect(MAX_UPLOAD_BYTES).toBeGreaterThan(twelveMegapixelJpegBytes);
  });

  it('gives the model longer to load than a single task gets to run', () => {
    expect(MODEL_LOAD_TIMEOUT_MS).toBeGreaterThan(WORKER_TASK_TIMEOUT_MS);
  });

  it('accepts HEIC so the failure can be explained rather than silently rejected', () => {
    // iPhones shoot HEIC by default. Rejecting it at the type check would give
    // the user "wrong file type" instead of the actual fix.
    expect(ACCEPTED_IMAGE_MIME_TYPES).toContain('image/heic');
  });
});

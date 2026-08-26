import { describe, expect, it } from 'vitest';
import { generateSyntheticHead } from '@/testing/fixtures/synthetic-head.generator';
import { SYNTHETIC_HEAD_FIXTURES } from '@/testing/fixtures/synthetic-head.constants';
import { createDetector } from './detector.factory';

const buffer = generateSyntheticHead(SYNTHETIC_HEAD_FIXTURES[0]!.spec);

describe('createDetector', () => {
  it('reports itself unavailable instead of killing the worker on startup', async () => {
    // A factory that threw at module load would take the worker with it, and
    // every request would then surface as worker-crashed — sending the next
    // person to read the message plumbing rather than find the missing model.
    await expect(createDetector().detectLandmarks(buffer)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });

  it('reports segmentation unavailable for the same reason', async () => {
    await expect(createDetector().segment(buffer)).rejects.toMatchObject({
      code: 'detector-unavailable',
    });
  });
});

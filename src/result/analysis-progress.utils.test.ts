import { describe, expect, it } from 'vitest';
import { ANALYSIS_STAGES } from '@/analysis/analysis-protocol.types';
import { analysisProgress } from './analysis-progress.utils';

const [FIRST_STAGE] = ANALYSIS_STAGES;
const LAST_STAGE = ANALYSIS_STAGES[ANALYSIS_STAGES.length - 1];

describe('analysisProgress', () => {
  it('starts at zero', () => {
    expect(analysisProgress(FIRST_STAGE, 0)).toBe(0);
  });

  it('reaches one only at the end of the last stage', () => {
    expect(analysisProgress(LAST_STAGE as (typeof ANALYSIS_STAGES)[number], 1)).toBe(1);
  });

  it('moves when the stage changes, even if the stage reports no progress', () => {
    // The whole reason this is driven by the stage first. The segmenter
    // reports no intermediate ratio worth the name, so a bar reading only the
    // ratio would sit at zero for several seconds and read as a hang.
    const stalled = ANALYSIS_STAGES.map((stage) => analysisProgress(stage, 0));

    for (let index = 1; index < stalled.length; index += 1) {
      expect(stalled[index]).toBeGreaterThan(Number(stalled[index - 1]));
    }
  });

  it('never goes backwards across the whole run', () => {
    const samples = ANALYSIS_STAGES.flatMap((stage) =>
      [0, 0.5, 1].map((ratio) => analysisProgress(stage, ratio)),
    );

    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThanOrEqual(Number(samples[index - 1]));
    }
  });

  it('clamps a ratio above one, which would otherwise overrun into the next stage', () => {
    // A worker reporting 1.4 would push the bar past the end of its own stage,
    // making progress appear to jump backwards when the next one starts.
    expect(analysisProgress(FIRST_STAGE, 1.4)).toBe(analysisProgress(FIRST_STAGE, 1));
  });

  it('clamps a negative ratio', () => {
    expect(analysisProgress(FIRST_STAGE, -2)).toBe(0);
  });

  it('stays within zero and one for every stage and any ratio', () => {
    for (const stage of ANALYSIS_STAGES) {
      for (const ratio of [-5, 0, 0.5, 1, 99]) {
        const progress = analysisProgress(stage, ratio);
        expect(progress).toBeGreaterThanOrEqual(0);
        expect(progress).toBeLessThanOrEqual(1);
      }
    }
  });
});

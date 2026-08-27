import { describe, expect, it, vi } from 'vitest';
import { RecordingCanvasContext } from '@/testing/recording-canvas';
import { buildAnnotatedPng } from './download-annotated';
import { ANNOTATED_EXPORT_MIME } from './export-annotated-png';
import type { AnnotatedExportTarget } from './download-annotated';

const SOURCE = { widthPx: 600, heightPx: 600 };
const IMAGE = {} as CanvasImageSource;

const canvasYielding = (
  blob: Blob | null,
  context: RecordingCanvasContext | null = new RecordingCanvasContext(),
): AnnotatedExportTarget => ({
  width: 0,
  height: 0,
  getContext: () => context,
  toBlob: (callback, type) => {
    expect(type).toBe(ANNOTATED_EXPORT_MIME);
    callback(blob);
  },
});

describe('building the file the reader downloads', () => {
  it('returns the encoded image', async () => {
    const blob = new Blob(['fake'], { type: ANNOTATED_EXPORT_MIME });

    await expect(buildAnnotatedPng(canvasYielding(blob), IMAGE, SOURCE, [])).resolves.toBe(blob);
  });

  it('returns nothing when the canvas would not compose', async () => {
    // Not a rejection. A photograph above the browser's maximum canvas area is
    // a device limit rather than a bug, and the caller has to tell the reader
    // either way — which a thrown error makes harder, not easier.
    const toBlob = vi.fn();

    await expect(
      buildAnnotatedPng({ ...canvasYielding(null, null), toBlob }, IMAGE, SOURCE, []),
    ).resolves.toBeUndefined();
    expect(toBlob).not.toHaveBeenCalled();
  });

  it('returns nothing when the encoder yields nothing', async () => {
    await expect(buildAnnotatedPng(canvasYielding(null), IMAGE, SOURCE, [])).resolves.toBeUndefined();
  });
});

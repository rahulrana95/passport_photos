import { MantineProvider } from '@mantine/core';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getContent } from '@/content/content.registry';
import { ANNOTATED_EXPORT_MIME } from '@/overlay/export-annotated-png';
import { RecordingCanvasContext } from '@/testing/recording-canvas';
import { AnnotatedPhotoDownload } from './AnnotatedPhotoDownload';
import type { AnnotatedExportTarget } from '@/overlay/download-annotated';
import type { OverlayInstruction } from '@/overlay/overlay-instruction.types';

const content = getContent();
const SOURCE = { widthPx: 600, heightPx: 600 };
const INSTRUCTIONS: readonly OverlayInstruction[] = [
  { kind: 'rect', role: 'crop', x: 0, y: 0, widthPx: 600, heightPx: 600 },
];

const anImage = (): HTMLImageElement => document.createElement('img');

const renderDownload = (
  props: Partial<Parameters<typeof AnnotatedPhotoDownload>[0]> = {},
): ReturnType<typeof render> =>
  render(
    <MantineProvider defaultColorScheme="auto">
      <AnnotatedPhotoDownload
        image={anImage()}
        source={SOURCE}
        instructions={INSTRUCTIONS}
        {...props}
      />
    </MantineProvider>,
  );

const workingCanvas = (): AnnotatedExportTarget => ({
  width: 0,
  height: 0,
  getContext: () => new RecordingCanvasContext(),
  toBlob: (callback) => callback(new Blob(['png'], { type: ANNOTATED_EXPORT_MIME })),
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AnnotatedPhotoDownload', () => {
  it('saves the composed image', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    const click = vi.fn();
    HTMLAnchorElement.prototype.click = click;

    renderDownload({ createCanvas: workingCanvas });
    await userEvent.click(screen.getByRole('button', { name: content.overlay.download }));

    await waitFor(() => {
      expect(click).toHaveBeenCalled();
    });
  });

  it('says so in place when the browser cannot build the image', async () => {
    // The realistic cause is a photograph larger than the browser will open on
    // a canvas. The measurements on screen are unaffected, so the reader needs
    // to be told this one button failed rather than shown an error page over a
    // result that is fine.
    renderDownload({
      createCanvas: () => ({ width: 0, height: 0, getContext: () => null, toBlob: vi.fn() }),
    });

    await userEvent.click(screen.getByRole('button', { name: content.overlay.download }));

    expect(await screen.findByText(content.overlay.downloadFailed)).toBeInTheDocument();
  });

  it('says nothing until something has gone wrong', () => {
    renderDownload();

    expect(screen.queryByText(content.overlay.downloadFailed)).not.toBeInTheDocument();
  });

  it('falls back to a real canvas when none is provided', async () => {
    // The default path. jsdom implements no 2D context, so this exercises the
    // same failure a browser reports for an oversized photograph.
    renderDownload();

    await userEvent.click(screen.getByRole('button', { name: content.overlay.download }));

    expect(await screen.findByText(content.overlay.downloadFailed)).toBeInTheDocument();
  });
});

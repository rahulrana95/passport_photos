import { MantineProvider } from '@mantine/core';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { resolveSpec } from '@/photo-spec/photo-spec.utils';
import { US_PASSPORT } from '@/photo-spec/specs/us.spec';
import { buildOverlay } from '@/overlay/build-overlay';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { RecordingResizeObserver, resizeObservedElements } from '@/testing/resize-observer.stub';
import { PhotoOverlay } from './PhotoOverlay';

const content = getContent();
const SPEC = resolveSpec(US_PASSPORT, new Date('2026-08-27T00:00:00Z'));

const INSTRUCTIONS = buildOverlay(
  {
    crop: { x: 100, y: 50, widthPx: 600, heightPx: 600 },
    chinY: 500,
    crownY: 150,
    eyeY: 300,
    faceMidlineX: 400,
  },
  SPEC,
);

const renderOverlay = (
  props: Partial<Parameters<typeof PhotoOverlay>[0]> = {},
): ReturnType<typeof render> =>
  render(
    <MantineProvider defaultColorScheme="auto">
      <PhotoOverlay
        imageSrc="blob:photo"
        sourceWidthPx={800}
        sourceHeightPx={800}
        instructions={INSTRUCTIONS}
        {...props}
      />
    </MantineProvider>,
  );

/**
 * The size a <canvas> has when nothing has ever sized it. Not zero — the HTML
 * default is 300 by 150, which is what "we have not painted yet" looks like.
 */
const UNPAINTED = { width: 300, height: 150 };

const canvasOf = (container: HTMLElement): HTMLCanvasElement => {
  const canvas = container.querySelector('canvas');
  if (canvas === null) throw new Error('The overlay must render a canvas.');
  return canvas;
};

describe('PhotoOverlay', () => {
  it('shows the photograph as an image, with alt text', () => {
    // The photograph is an <img> rather than pixels painted into the canvas
    // precisely so that it has an alt. Drawn into the canvas it would be
    // nothing at all to a reader using a screen reader.
    renderOverlay();

    expect(screen.getByAltText(content.overlay.photoAlt)).toBeInTheDocument();
  });

  it('hides the annotation canvas from assistive technology', () => {
    // Its content is geometry with no text. The legend below carries the
    // meaning, so announcing an empty canvas would only add noise.
    const { container } = renderOverlay();

    expect(canvasOf(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('names every mark it drew', () => {
    renderOverlay();

    expect(screen.getByText(content.overlay.roles['crop'])).toBeInTheDocument();
    expect(screen.getByText(content.overlay.roles['head-span'])).toBeInTheDocument();
  });

  it('reserves the photograph’s shape before it decodes', () => {
    // Without this the page jumps when the image arrives, and the canvas laid
    // over it is briefly the wrong box.
    const { container } = renderOverlay({ sourceWidthPx: 600, sourceHeightPx: 900 });
    const frame = container.querySelector('figure > div');

    expect(frame?.getAttribute('style')).toContain('600 / 900');
  });
});

describe('offering the marked-up photo', () => {
  it('waits for the photograph to decode before offering it', () => {
    // drawImage on an image the browser has not finished decoding draws
    // nothing, so an export taken now would be a blank frame with the
    // measurements neatly drawn on it.
    renderOverlay();

    expect(screen.queryByRole('button', { name: content.overlay.download })).not.toBeInTheDocument();
  });

  it('offers it once the photograph has decoded', () => {
    renderOverlay();

    act(() => {
      fireEvent.load(screen.getByAltText(content.overlay.photoAlt));
    });

    expect(screen.getByRole('button', { name: content.overlay.download })).toBeInTheDocument();
  });

  it('withdraws the offer when a different photograph arrives', () => {
    // Checking a second photo is the whole loop of this product. Left alone,
    // the button would stay live over the previous image for as long as the
    // new one takes to decode — on a phone photograph, long enough to press.
    const { rerender } = renderOverlay();

    act(() => {
      fireEvent.load(screen.getByAltText(content.overlay.photoAlt));
    });
    rerender(
      <MantineProvider defaultColorScheme="auto">
        <PhotoOverlay
          imageSrc="blob:another-photo"
          sourceWidthPx={800}
          sourceHeightPx={800}
          instructions={INSTRUCTIONS}
        />
      </MantineProvider>,
    );

    expect(screen.queryByRole('button', { name: content.overlay.download })).not.toBeInTheDocument();
  });
});

describe('redrawing when the box changes', () => {
  it('paints once the container has been measured', () => {
    // The backing store is sized on every paint, so its width is the
    // observable proof that a paint happened at all — jsdom gives no 2D
    // context, so nothing further can be seen from here.
    const { container } = renderOverlay();
    const canvas = canvasOf(container);

    expect({ width: canvas.width, height: canvas.height }).toEqual(UNPAINTED);

    act(() => {
      resizeObservedElements({ widthPx: 400, heightPx: 400 });
    });

    expect({ width: canvas.width, height: canvas.height }).toEqual({ width: 400, height: 400 });
  });

  it('repaints at the new size without touching the instructions', () => {
    // The whole reason the annotations are held in source coordinates: a
    // resize is a new transform over the same instructions, never a re-run of
    // an analysis that took seconds.
    const { container } = renderOverlay();
    const canvas = canvasOf(container);

    act(() => {
      resizeObservedElements({ widthPx: 400, heightPx: 400 });
    });
    act(() => {
      resizeObservedElements({ widthPx: 250, heightPx: 250 });
    });

    expect(canvas.width).toBe(250);
  });

  it('stops observing when it goes away', () => {
    const { container, unmount } = renderOverlay();
    const canvas = canvasOf(container);

    unmount();
    act(() => {
      resizeObservedElements({ widthPx: 900, heightPx: 900 });
    });

    expect({ width: canvas.width, height: canvas.height }).toEqual(UNPAINTED);
  });

  it('observes the frame rather than the window', () => {
    // The frame changes size when a sidebar opens or the legend below it wraps
    // to another line, and neither of those is a window resize.
    renderOverlay();

    expect(RecordingResizeObserver.instances).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderOverlay();

    await expectNoAxeViolations(container);
  });
});

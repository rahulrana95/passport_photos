import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHANNELS_PER_PIXEL } from '@/testing/fixtures/pixel-format.constants';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { stubCameraEnvironment } from '@/testing/camera-environment.stub';
import { CameraCapture } from './CameraCapture';
import type { CameraCaptureProps } from './CameraCapture.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';

const content = getContent().camera;

const spec = (): ResolvedPhotoSpec =>
  ({
    print: { widthMm: 51, heightMm: 51, dpi: 300 },
    headHeight: { minMm: 25, maxMm: 35, minRatio: 0.49, maxRatio: 0.69, authoredUnit: 'mm' },
    background: { colour: 'white', hexRange: ['#e0e0e0', '#ffffff'], uniformityTolerance: 12 },
  }) as unknown as ResolvedPhotoSpec;

const renderCamera = (
  overrides: Partial<CameraCaptureProps> = {},
): { readonly environment: ReturnType<typeof stubCameraEnvironment> } & ReturnType<typeof render> => {
  const environment = overrides.environment ?? stubCameraEnvironment();
  const view = render(
    <CameraCapture
      spec={spec()}
      crownDefinition="visible-top"
      onCapture={vi.fn()}
      analyse={vi.fn(async () => ({ landmarks: undefined, segmentation: undefined }))}
      {...overrides}
      environment={environment}
    />,
  );

  return { ...view, environment: environment as ReturnType<typeof stubCameraEnvironment> };
};

const SENSOR_WIDTH = 1_920;
const SENSOR_HEIGHT = 1_080;
const HAVE_CURRENT_DATA = 2;

/**
 * Gives jsdom just enough camera to run the loop through.
 *
 * jsdom implements no canvas and no media element beyond the tag, so without
 * this the frame grab bails on the first line and the two paths that matter
 * most — the guidance loop and the capture itself — are never entered by any
 * test. Restored afterwards so a test that does not want a working canvas
 * still gets the project's null-returning stub.
 */
const withWorkingCanvas = (): (() => void) => {
  const realGetContext = window.HTMLCanvasElement.prototype.getContext;
  const realToBlob = window.HTMLCanvasElement.prototype.toBlob;

  window.HTMLCanvasElement.prototype.getContext = (() => ({
    drawImage: () => undefined,
    getImageData: (_sx: number, _sy: number, sw: number, sh: number) => ({
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * CHANNELS_PER_PIXEL),
    }),
  })) as unknown as HTMLCanvasElement['getContext'];

  window.HTMLCanvasElement.prototype.toBlob = function toBlob(
    callback: BlobCallback,
  ): void {
    callback(new Blob([new Uint8Array(1)], { type: 'image/jpeg' }));
  };

  return () => {
    window.HTMLCanvasElement.prototype.getContext = realGetContext;
    window.HTMLCanvasElement.prototype.toBlob = realToBlob;
  };
};

/** Makes the preview element report a stream, which jsdom never does. */
const primeVideo = (): void => {
  const video = screen.getByLabelText(content.previewLabel);

  for (const [property, value] of [
    ['videoWidth', SENSOR_WIDTH],
    ['videoHeight', SENSOR_HEIGHT],
    ['readyState', HAVE_CURRENT_DATA],
  ] as const) {
    Object.defineProperty(video, property, { configurable: true, value });
  }
};

const startCamera = async (): Promise<void> => {
  await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));
  await screen.findByRole('button', { name: content.captureLabel });
};

describe('before the camera is on', () => {
  it('offers to start it', () => {
    renderCamera();

    expect(screen.getByRole('button', { name: content.startLabel })).toBeInTheDocument();
  });

  it('opens no camera until it is asked to', () => {
    // A page that grabbed the camera on load would put the indicator light on
    // before the reader had decided to use it.
    const { environment } = renderCamera();

    expect(environment.opened()).toBe(0);
  });

  it('offers the upload route alongside, not only as a last resort', () => {
    // Most desktops have no camera worth using and plenty of readers already
    // have a better photograph on their phone.
    renderCamera({ onUploadInstead: vi.fn() });

    expect(screen.getByRole('button', { name: content.fallbackToUpload })).toBeInTheDocument();
  });

  it('omits the upload route when the page has nowhere to send them', () => {
    renderCamera();

    expect(screen.queryByRole('button', { name: content.fallbackToUpload })).not.toBeInTheDocument();
  });

  it('hands over to the upload flow when asked', async () => {
    const onUploadInstead = vi.fn();
    renderCamera({ onUploadInstead });

    await userEvent.setup().click(screen.getByRole('button', { name: content.fallbackToUpload }));

    expect(onUploadInstead).toHaveBeenCalledTimes(1);
  });
});

describe('starting the camera', () => {
  it('opens it and offers the shutter', async () => {
    const { environment } = renderCamera();

    await startCamera();

    expect(environment.opened()).toBe(1);
  });

  it('names the preview for a screen reader', async () => {
    renderCamera();
    await startCamera();

    expect(screen.getByLabelText(content.previewLabel)).toBeInTheDocument();
  });

  it('mirrors the front camera preview', async () => {
    // So that moving left looks like moving left. A display transform only —
    // the capture reads the stream, which was never flipped.
    renderCamera();
    await startCamera();

    expect(screen.getByLabelText(content.previewLabel)).toHaveAttribute('data-mirrored', 'true');
  });

  it('offers to switch cameras once one is running', async () => {
    renderCamera();
    await startCamera();

    expect(screen.getByRole('button', { name: content.switchCameraLabel })).toBeInTheDocument();
  });

  it('stops the first camera before opening the second', async () => {
    const { environment } = renderCamera();
    await startCamera();

    await userEvent.setup().click(screen.getByRole('button', { name: content.switchCameraLabel }));

    await waitFor(() => {
      expect(environment.opened()).toBe(2);
    });
    expect(environment.stopped()).toBeGreaterThan(0);
  });

  it('switches back to the front camera again', async () => {
    renderCamera();
    await startCamera();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: content.switchCameraLabel }));
    await waitFor(() => {
      expect(screen.getByLabelText(content.previewLabel)).toHaveAttribute('data-mirrored', 'false');
    });
    await user.click(screen.getByRole('button', { name: content.switchCameraLabel }));

    await waitFor(() => {
      expect(screen.getByLabelText(content.previewLabel)).toHaveAttribute('data-mirrored', 'true');
    });
  });

  it('un-mirrors the preview on the rear camera', async () => {
    renderCamera();
    await startCamera();

    await userEvent.setup().click(screen.getByRole('button', { name: content.switchCameraLabel }));

    await waitFor(() => {
      expect(screen.getByLabelText(content.previewLabel)).toHaveAttribute('data-mirrored', 'false');
    });
  });
});

describe('turning the camera off', () => {
  it('stops every track', async () => {
    // A track left running keeps the indicator lit. On a product that promises
    // the photograph never leaves the device, that light IS the accusation.
    const { environment } = renderCamera();
    await startCamera();

    await userEvent.setup().click(screen.getByRole('button', { name: content.stopLabel }));

    await waitFor(() => {
      expect(environment.stopped()).toBe(1);
    });
  });

  it('offers to start again', async () => {
    renderCamera();
    await startCamera();

    await userEvent.setup().click(screen.getByRole('button', { name: content.stopLabel }));

    expect(await screen.findByRole('button', { name: content.startLabel })).toBeInTheDocument();
  });

  it('stops a camera that opened after the reader had already left', async () => {
    // Pressed start, then navigated away before answering the permission
    // prompt. Nothing else would ever stop this stream: the unmount cleanup
    // ran while getUserMedia was still in flight and found nothing to stop,
    // and the camera light stays on over an empty page.
    let release: (() => void) | undefined;
    const environment = stubCameraEnvironment();
    const gated = {
      ...environment,
      mediaDevices: {
        getUserMedia: async (constraints: MediaStreamConstraints) => {
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return environment.mediaDevices?.getUserMedia(constraints) as Promise<MediaStream>;
        },
      },
    };

    const { unmount } = renderCamera({ environment: gated as never });
    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    unmount();
    release?.();

    await waitFor(() => {
      expect(environment.stopped()).toBe(1);
    });
  });

  it('stops the camera when the component goes away', async () => {
    const { environment, unmount } = renderCamera();
    await startCamera();

    unmount();

    expect(environment.stopped()).toBe(1);
  });
});

describe('the real browser', () => {
  it('is used when no environment is injected', async () => {
    // jsdom has a window and no getUserMedia, and is not a secure context —
    // which is the shape that must be reported as a protocol problem rather
    // than as missing hardware.
    render(
      <CameraCapture
        spec={spec()}
        crownDefinition="visible-top"
        onCapture={vi.fn()}
        analyse={vi.fn(async () => ({ landmarks: undefined, segmentation: undefined }))}
      />,
    );

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    expect(
      await screen.findByText(content.failures['insecure-context'].message),
    ).toBeInTheDocument();
  });
});

describe('when the camera cannot be opened', () => {
  const denied = (): ReturnType<typeof stubCameraEnvironment> =>
    stubCameraEnvironment({ reject: Object.assign(new Error('no'), { name: 'NotAllowedError' }) });

  it('says who is blocking it and where the button is', async () => {
    renderCamera({ environment: denied() });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    expect(
      await screen.findByText(content.failures['permission-denied'].message),
    ).toBeInTheDocument();
    expect(screen.getByText(content.failures['permission-denied'].remedy)).toBeInTheDocument();
  });

  it('interrupts for a failure, because the reader is waiting on it', async () => {
    renderCamera({ environment: denied() });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('leaves the start button so the reader can grant permission and retry', async () => {
    renderCamera({ environment: denied() });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));
    await screen.findByRole('alert');

    expect(screen.getByRole('button', { name: content.startLabel })).toBeInTheDocument();
  });

  it('blames the protocol rather than the hardware over plain http', async () => {
    renderCamera({
      environment: { mediaDevices: undefined, isSecureContext: false } as never,
    });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    expect(
      await screen.findByText(content.failures['insecure-context'].message),
    ).toBeInTheDocument();
  });

  it('tells somebody with no camera to upload instead, not to hunt through settings', async () => {
    renderCamera({
      environment: stubCameraEnvironment({
        reject: Object.assign(new Error('no'), { name: 'NotFoundError' }),
      }),
    });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    expect(await screen.findByText(content.failures['no-camera'].message)).toBeInTheDocument();
  });

  it('clears an old failure when the reader tries again', async () => {
    const environment = stubCameraEnvironment();
    const { rerender } = renderCamera({
      environment: stubCameraEnvironment({
        reject: Object.assign(new Error('no'), { name: 'NotAllowedError' }),
      }),
    });

    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));
    await screen.findByRole('alert');

    rerender(
      <CameraCapture
        spec={spec()}
        crownDefinition="visible-top"
        onCapture={vi.fn()}
        analyse={vi.fn(async () => ({ landmarks: undefined, segmentation: undefined }))}
        environment={environment}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: content.startLabel }));

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

describe('the live loop', () => {
  let restoreCanvas: (() => void) | undefined;

  afterEach(() => {
    restoreCanvas?.();
    restoreCanvas = undefined;
  });

  it('analyses frames and says what to do about them', async () => {
    restoreCanvas = withWorkingCanvas();
    const analyse = vi.fn(async () => ({ landmarks: undefined, segmentation: undefined }));
    renderCamera({ analyse, intervalMs: 1 });

    await startCamera();
    primeVideo();

    await waitFor(() => {
      expect(analyse).toHaveBeenCalled();
    });
    // The stub frame is all zeroes, which is a black room — and guidance
    // reports the light before anything it read off the detector, because
    // landmarks from a dark frame come back confident and wrong.
    expect(screen.getByText(content.guidance['too-dark'])).toBeInTheDocument();
  });

  it('measures the stream, not the element it is displayed in', async () => {
    // A preview laid out at a few hundred CSS pixels still carries the whole
    // 1920x1080 of picture behind it.
    restoreCanvas = withWorkingCanvas();
    let seen: { readonly width: number; readonly height: number } | undefined;
    const analyse = vi.fn(async (frame: { readonly width: number; readonly height: number }) => {
      seen ??= frame;
      return { landmarks: undefined, segmentation: undefined };
    });
    renderCamera({ analyse, intervalMs: 1 });

    await startCamera();
    primeVideo();

    await waitFor(() => {
      expect(seen).toBeDefined();
    });
    expect((seen?.width ?? 0) / (seen?.height ?? 1)).toBeCloseTo(SENSOR_WIDTH / SENSOR_HEIGHT, 2);
  });

  it('keeps going when the detector fails on a frame', async () => {
    // A frozen preview leaves a stale instruction on screen, and the reader
    // follows advice about a picture from ten seconds ago.
    restoreCanvas = withWorkingCanvas();
    const analyse = vi.fn(async () => {
      throw new Error('detector timed out');
    });
    renderCamera({ analyse, intervalMs: 1 });

    await startCamera();
    primeVideo();

    await waitFor(() => {
      expect(analyse.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('stops analysing when the tab is hidden', async () => {
    // A backgrounded tab keeps its camera open, and a detection loop running
    // against a frame nobody is looking at is pure heat.
    restoreCanvas = withWorkingCanvas();
    const analyse = vi.fn(async () => ({ landmarks: undefined, segmentation: undefined }));
    renderCamera({ analyse, intervalMs: 1 });

    await startCamera();
    primeVideo();
    await waitFor(() => {
      expect(analyse).toHaveBeenCalled();
    });

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: content.startLabel })).toBeInTheDocument();
    });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });

  it('leaves the camera alone while the tab stays visible', async () => {
    restoreCanvas = withWorkingCanvas();
    renderCamera({ intervalMs: 1 });
    await startCamera();

    document.dispatchEvent(new Event('visibilitychange'));

    expect(screen.getByRole('button', { name: content.captureLabel })).toBeInTheDocument();
  });
});

describe('taking the photograph', () => {
  let restoreCanvas: (() => void) | undefined;

  afterEach(() => {
    restoreCanvas?.();
    restoreCanvas = undefined;
  });

  it('hands over an encoded photograph', async () => {
    restoreCanvas = withWorkingCanvas();
    const onCapture = vi.fn();
    renderCamera({ onCapture, intervalMs: 1 });

    await startCamera();
    primeVideo();
    await userEvent.setup().click(screen.getByRole('button', { name: content.captureLabel }));

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith(expect.any(Blob));
    });
  });

  it('hands over nothing when the browser could not encode one', async () => {
    restoreCanvas = withWorkingCanvas();
    window.HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void {
      callback(null);
    };
    const onCapture = vi.fn();
    renderCamera({ onCapture, intervalMs: 1 });

    await startCamera();
    primeVideo();
    await userEvent.setup().click(screen.getByRole('button', { name: content.captureLabel }));

    expect(onCapture).not.toHaveBeenCalled();
  });

  it('does nothing when the shutter is pressed before there is a frame', async () => {
    restoreCanvas = withWorkingCanvas();
    const onCapture = vi.fn();
    renderCamera({ onCapture, intervalMs: 1 });

    await startCamera();
    await userEvent.setup().click(screen.getByRole('button', { name: content.captureLabel }));

    expect(onCapture).not.toHaveBeenCalled();
  });
});

describe('accessibility', () => {
  it('has no violations before the camera is on', async () => {
    const { container } = renderCamera({ onUploadInstead: vi.fn() });

    await expectNoAxeViolations(container);
  });

  it('has no violations while it is running', async () => {
    const { container } = renderCamera();
    await startCamera();

    await expectNoAxeViolations(container);
  });
});

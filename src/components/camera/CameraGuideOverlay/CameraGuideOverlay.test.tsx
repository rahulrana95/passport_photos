import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { CameraGuideOverlay } from './CameraGuideOverlay';
import type { LiveGuidance } from '@/camera/guidance/guidance.types';

const content = getContent().camera;

const guidance = (overrides: Partial<LiveGuidance> = {}): LiveGuidance => ({
  primary: 'move-closer',
  unmet: ['move-closer'],
  ready: false,
  headFrameRatio: 0.42,
  ...overrides,
});

describe('CameraGuideOverlay', () => {
  it('says the one thing to do', () => {
    render(<CameraGuideOverlay guidance={guidance()} />);

    expect(screen.getByText(content.guidance['move-closer'])).toBeInTheDocument();
  });

  it('never lists the other faults, however many there are', () => {
    // A live view that lists five faults gets none of them fixed: the reader
    // reads, looks up, and the picture has already changed.
    render(
      <CameraGuideOverlay
        guidance={guidance({ unmet: ['move-closer', 'level-head', 'plain-background'] })}
      />,
    );

    expect(screen.queryByText(content.guidance['level-head'])).not.toBeInTheDocument();
    expect(screen.queryByText(content.guidance['plain-background'])).not.toBeInTheDocument();
  });

  it('says hold still once there is nothing left to fix', () => {
    render(<CameraGuideOverlay guidance={guidance({ primary: 'ready', unmet: [], ready: true })} />);

    expect(screen.getByText(content.guidance.ready)).toBeInTheDocument();
  });

  it('marks the ready state for the eye as well as for the reader', () => {
    render(<CameraGuideOverlay guidance={guidance({ primary: 'ready', unmet: [], ready: true })} />);

    expect(screen.getByRole('status')).toHaveAttribute('data-ready', 'true');
  });

  it('reports the head size as a whole percentage', () => {
    render(<CameraGuideOverlay guidance={guidance({ headFrameRatio: 0.427 })} />);

    expect(screen.getByText(/43%/)).toBeInTheDocument();
  });

  it('says nothing about head size before there is a head to measure', () => {
    render(<CameraGuideOverlay guidance={guidance({ headFrameRatio: undefined })} />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('announces politely, not assertively', () => {
    // Assertive would interrupt whatever the reader is being told several
    // times a second, which turns a live camera into unusable chatter.
    render(<CameraGuideOverlay guidance={guidance()} />);

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the camera is starting rather than that no face was found', () => {
    // "Looking for your face" before there is a picture at all reads as a
    // failure rather than as a camera warming up.
    render(<CameraGuideOverlay guidance={guidance({ primary: 'no-face' })} waiting />);

    expect(screen.getByText(content.previewLabel)).toBeInTheDocument();
  });

  it('hides the decorative guide from assistive technology', () => {
    const { container } = render(<CameraGuideOverlay guidance={guidance()} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CameraGuideOverlay guidance={guidance()} />);

    await expectNoAxeViolations(container);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { RecordingResizeObserver, resizeObservedElements } from './resize-observer.stub';

const anElement = (): HTMLElement => document.createElement('div');

describe('the ResizeObserver stub', () => {
  it('delivers one entry per observed element', () => {
    const callback = vi.fn();
    const observer = new RecordingResizeObserver(callback);
    observer.observe(anElement());
    observer.observe(anElement());

    observer.resize({ widthPx: 400, heightPx: 300 });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('reports the size it was given as a content rect', () => {
    const callback = vi.fn();
    const observer = new RecordingResizeObserver(callback);
    observer.observe(anElement());

    observer.resize({ widthPx: 400, heightPx: 300 });

    expect(callback.mock.calls[0]?.[0][0].contentRect).toEqual({ width: 400, height: 300 });
  });

  it('stops delivering to an element it was told to drop', () => {
    const callback = vi.fn();
    const observer = new RecordingResizeObserver(callback);
    const element = anElement();
    observer.observe(element);
    observer.unobserve(element);

    observer.resize({ widthPx: 400, heightPx: 300 });

    expect(callback).not.toHaveBeenCalled();
  });

  it('stops delivering anything once disconnected', () => {
    const callback = vi.fn();
    const observer = new RecordingResizeObserver(callback);
    observer.observe(anElement());
    observer.disconnect();

    observer.resize({ widthPx: 400, heightPx: 300 });

    expect(callback).not.toHaveBeenCalled();
  });

  it('resizes every observer at once, whoever created them', () => {
    const first = vi.fn();
    const second = vi.fn();
    new RecordingResizeObserver(first).observe(anElement());
    new RecordingResizeObserver(second).observe(anElement());

    resizeObservedElements({ widthPx: 200, heightPx: 100 });

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
});

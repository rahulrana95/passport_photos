export interface ObservedSize {
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * A ResizeObserver that tests can actually fire.
 *
 * jsdom implements none, and the no-op stub that stood here before meant any
 * component reacting to its own size was frozen at zero for the whole unit
 * suite — which is to say its most interesting behaviour was only ever seen in
 * a browser screenshot.
 *
 * Faithful in the ways that matter: it delivers a contentRect, it delivers one
 * entry per observed element, and disconnecting stops delivery. It is not
 * faithful about timing — a real observer batches to an animation frame — and
 * nothing here depends on that.
 */
export class RecordingResizeObserver implements ResizeObserver {
  static instances: RecordingResizeObserver[] = [];

  private readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    RecordingResizeObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }

  /** Delivers one resize to every element this observer is watching. */
  resize(size: ObservedSize): void {
    const entries = [...this.targets].map(
      (target) =>
        ({
          target,
          contentRect: { width: size.widthPx, height: size.heightPx },
        }) as unknown as ResizeObserverEntry,
    );

    if (entries.length > 0) this.callback(entries, this);
  }
}

/** Resizes everything currently observed, whichever component set it up. */
export const resizeObservedElements = (size: ObservedSize): void => {
  for (const observer of RecordingResizeObserver.instances) observer.resize(size);
};

export const resetResizeObservers = (): void => {
  RecordingResizeObserver.instances = [];
};

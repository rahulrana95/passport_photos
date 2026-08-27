import type { FrameLoop, FrameLoopOptions } from './frame-loop.types';

/**
 * Runs the analysis over and over without ever running two at once.
 *
 * THE INTERVAL IS MEASURED FROM THE END OF THE LAST RUN, not on a fixed
 * schedule, and that is the entire design. setInterval at 300ms on a device
 * where detection takes 400ms does not give you three analyses a second — it
 * gives you an unbounded queue, a hot phone, and guidance that describes where
 * the reader's head was several seconds ago. Self-scheduling after completion
 * degrades instead: a slower device simply gets fewer updates, each of them
 * about the frame in front of it.
 *
 * A frame that is not ready costs a tick rather than a special case. The
 * camera takes a moment to produce its first frame and the loop is started
 * before then on purpose, so that the first instruction appears the instant
 * there is something to say about.
 */
export const createFrameLoop = (options: FrameLoopOptions): FrameLoop => {
  const schedule = options.setTimeoutFn ?? setTimeout;
  const cancel = options.clearTimeoutFn ?? clearTimeout;

  let running = false;
  let handle: ReturnType<typeof setTimeout> | undefined;

  const scheduleNext = (): void => {
    if (!running) return;
    handle = schedule(() => void tick(), options.intervalMs);
  };

  const tick = async (): Promise<void> => {
    try {
      const frame = options.grab();
      if (frame !== undefined) await options.onFrame(frame);
    } catch (error) {
      options.onError?.(error);
    }

    // The only guard that is needed, and it is needed AFTER the await: stop()
    // can be called while an analysis is in flight, and scheduling here
    // regardless would keep the detector running after the camera was shut
    // off. There is deliberately no matching check at the top of this
    // function — stop() cancels the pending handle, so a tick that has begun
    // was always started by a running loop, and a guard there would be a
    // branch no input can reach.
    scheduleNext();
  };

  return {
    start: (): void => {
      if (running) return;
      running = true;
      void tick();
    },
    stop: (): void => {
      running = false;
      if (handle !== undefined) cancel(handle);
      handle = undefined;
    },
    isRunning: (): boolean => running,
  };
};

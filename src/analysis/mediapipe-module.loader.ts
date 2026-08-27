import type { MediaPipeModules } from './mediapipe-detector';

/**
 * The dynamic import, alone in its own module.
 *
 * A static import would pull @mediapipe/tasks-vision into whatever chunk
 * imports it, and the 15 MB behind it would sit on the critical path of every
 * country page carrying our search traffic. Nothing here loads until someone
 * chooses a photo.
 *
 * Separated so it is the only thing that cannot be unit-tested: importing it
 * under jsdom would try to instantiate a WebAssembly runtime that has no
 * business being in a unit test. Everything that decides anything lives in
 * detector.factory.ts and is covered there, with this function injected.
 */
export const importMediaPipe = async (): Promise<MediaPipeModules> => {
  // Not named `module`: Next forbids assigning that identifier, because it
  // shadows the CommonJS global and breaks the bundler's module analysis.
  const bundle = await import('@mediapipe/tasks-vision');

  return {
    FilesetResolver: bundle.FilesetResolver,
    FaceLandmarker: bundle.FaceLandmarker,
    ImageSegmenter: bundle.ImageSegmenter,
  };
};

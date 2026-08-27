import type { MediaPipeModules } from './mediapipe-detector';

export interface FakeFace {
  /** Normalised landmark points, as the real model reports them. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
  /** Column-major 4x4 facial transform. Omit for a face with no pose data. */
  readonly matrix?: readonly number[];
}

export interface FakeMediaPipeOptions {
  readonly faces?: readonly FakeFace[];
  readonly blendshapes?: Readonly<Record<string, number>>;
  /** Reproduces a browser with WebGL disabled, where only the CPU path works. */
  readonly gpuUnavailable?: boolean;
  /** Reproduces a runtime that cannot start at all. */
  readonly failToStart?: boolean;
  /** Records which delegate each successful build used. */
  readonly onBuild?: (delegate: string) => void;
}

/**
 * A stand-in for @mediapipe/tasks-vision.
 *
 * The adapter around the real model is where the bugs are — the column-major
 * matrix read in this file's counterpart was wrong first time and produced a
 * head reported as tilted when it was turned. Injecting the modules makes all
 * of that testable without a WebAssembly runtime; only the dynamic import
 * itself stays untested.
 */
export const createFakeMediaPipe = (options: FakeMediaPipeOptions = {}): MediaPipeModules => {
  const faces = options.faces ?? [];

  const detect = (): unknown => ({
    faceLandmarks: faces.map((face) => face.points),
    // Faces without a matrix are omitted rather than given an empty one, which
    // is what the real model does: the array can be shorter than the face list,
    // so the adapter must survive an index that has nothing behind it.
    facialTransformationMatrixes: faces
      .filter((face) => face.matrix !== undefined)
      .map((face) => ({ data: face.matrix })),
    faceBlendshapes:
      options.blendshapes === undefined
        ? []
        : [
            {
              categories: Object.entries(options.blendshapes).map(([categoryName, score]) => ({
                categoryName,
                score,
              })),
            },
          ],
  });

  const modules = {
    FilesetResolver: {
      forVisionTasks: (): Promise<unknown> =>
        options.failToStart === true
          ? Promise.reject(new Error('no WebAssembly'))
          : Promise.resolve({ wasmLoaderPath: 'fake' }),
    },
    FaceLandmarker: {
      createFromOptions: (
        _fileset: unknown,
        landmarkerOptions: { baseOptions: { delegate: string } },
      ): Promise<unknown> => {
        const { delegate } = landmarkerOptions.baseOptions;

        if (delegate === 'GPU' && options.gpuUnavailable === true) {
          return Promise.reject(new Error('WebGL unavailable'));
        }

        options.onBuild?.(delegate);
        return Promise.resolve({ detect });
      },
    },
  };

  return modules as unknown as MediaPipeModules;
};

import type { IngestionFailure } from '@/ingestion/ingestion-failure.types';

export interface UploadZoneProps {
  /** Called with a file that passed the byte-level checks. */
  readonly onFile: (file: File) => void;
  /**
   * Called once, the first time a pointer comes near.
   *
   * The models are fifteen megabytes and take seconds to compile. Starting
   * them when somebody's cursor approaches the drop zone is most of a second
   * saved off the only wait in the product, and it costs nothing when they
   * were only passing.
   */
  readonly onWarmUp?: (() => void) | undefined;
  /** True while an analysis is already running. */
  readonly busy?: boolean;
  /**
   * A refusal the caller produced, rendered exactly like one detected here.
   *
   * Half the refusals in the pipeline are only knowable after a decoder has
   * run — a damaged JPEG, an image too small to print, an animated GIF — and
   * decoding happens downstream of this component. Without this prop those
   * failures have nowhere to go but a second error block in a second style,
   * next to the one the reader has already learnt to read.
   *
   * Controlled the same way `busy` is: the caller clears it when it starts on
   * a new file. A refusal detected here outranks it, because that one is about
   * the file the reader just chose.
   */
  readonly failure?: IngestionFailure | undefined;
  /** Reported instead of accepting the file. Rendered with its remedy. */
  readonly onRejected?: ((failure: IngestionFailure) => void) | undefined;
  /**
   * Opens a live camera, when the caller has one to open.
   *
   * WITHOUT THIS, "Take a photo" IS A FILE INPUT CARRYING `capture`, and that
   * attribute is ignored on every desktop browser — the button opens the same
   * picker as "Choose a photo" and the reader is left wondering what happened.
   * It is still the right control on a phone, where it opens the camera app at
   * full sensor resolution, and it is the only one that works in a webview
   * with no getUserMedia. So both exist, and the caller decides: pass this and
   * the button opens the guided camera; leave it out and the phone's own
   * camera app is what opens.
   */
  readonly onUseCamera?: (() => void) | undefined;
}

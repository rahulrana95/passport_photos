import { MAX_SOURCE_DIMENSION_PX, MAX_UPLOAD_BYTES, MIN_SOURCE_EDGE_PX } from '@/constants/limits.constants';
import type { ImageFormat } from './image-format.constants';
import type { IngestionFailure } from './ingestion-failure.types';

const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;

const megabytes = (bytes: number): string => `${Math.round(bytes / BYTES_PER_MEGABYTE)}MB`;

/**
 * The refusals, written out rather than templated.
 *
 * Each remedy names the actual next action, in the words of someone who has
 * the file open in front of them. A generic "please try another file" is the
 * point at which someone gives up and pays a competitor $17.
 */
export const ingestionFailures = {
  emptyFile: (): IngestionFailure => ({
    code: 'empty-file',
    message: 'That file is empty.',
    remedy:
      'It may not have finished copying or downloading. Check the file opens on your device, then try again.',
  }),

  tooLarge: (byteLength: number): IngestionFailure => ({
    code: 'too-large',
    message: `That file is ${megabytes(byteLength)}, over the ${megabytes(MAX_UPLOAD_BYTES)} limit.`,
    remedy:
      'This is usually a RAW file from a camera. Export it as a JPEG first — any photo app will do it, and the quality is more than enough for a passport photo.',
  }),

  unrecognisedFormat: (): IngestionFailure => ({
    code: 'unrecognised-format',
    message: 'That does not look like an image file.',
    remedy:
      'Check you picked the photo itself rather than a document, an archive, or a shortcut to it. JPEG, PNG and HEIC all work.',
  }),

  formatNotSupported: (format: ImageFormat): IngestionFailure => ({
    code: 'format-not-supported',
    message: `${format.toUpperCase()} files cannot be read here.`,
    remedy:
      'Open the photo on your device and export or save it as a JPEG, then upload that. Every phone and photo app can do this.',
    detectedFormat: format,
  }),

  heicNotDecodable: (): IngestionFailure => ({
    code: 'format-not-supported',
    message: 'This browser cannot open HEIC photos, which is how iPhones save them by default.',
    // The exact steps, because "convert it" is not an instruction anyone can follow.
    remedy:
      'On iPhone: open the photo in Photos, tap Share, choose Copy Photo, and paste it here — iOS converts it to JPEG automatically. On a computer: open it in Preview or Photos and export as JPEG. Or upload from your iPhone directly, where this works without converting.',
    detectedFormat: 'heic',
  }),

  decodeFailed: (format: ImageFormat): IngestionFailure => ({
    code: 'decode-failed',
    message: 'That image could not be opened — the file looks damaged or incomplete.',
    remedy:
      'Try sending the photo to yourself again, or pick a different one. A file that stopped partway through a download or transfer will do this.',
    detectedFormat: format,
  }),

  tooSmall: (widthPx: number, heightPx: number): IngestionFailure => ({
    code: 'too-small',
    message: `That image is ${widthPx}x${heightPx} pixels, too small to print at passport quality.`,
    remedy: `Use the original photo rather than a copy saved from a message or a website — those are shrunk. The shorter side needs at least ${MIN_SOURCE_EDGE_PX} pixels.`,
  }),

  tooLargeDimensions: (widthPx: number, heightPx: number): IngestionFailure => ({
    code: 'too-large-dimensions',
    message: `That image is ${widthPx}x${heightPx} pixels, beyond what a browser can open.`,
    remedy: `Resize it so neither side is over ${MAX_SOURCE_DIMENSION_PX} pixels, or export it again at a normal photo size.`,
  }),

  animatedSource: (format: ImageFormat): IngestionFailure => ({
    code: 'animated-source',
    message: 'That is an animated image, not a photograph.',
    remedy: 'Upload a still photo of your face — a JPEG or PNG straight from the camera.',
    detectedFormat: format,
  }),
} as const;

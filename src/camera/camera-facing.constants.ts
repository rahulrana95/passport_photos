/**
 * Which way the camera points.
 *
 * 'user' is the front camera and the default, because somebody photographing
 * themselves is the whole case. 'environment' exists because the rear camera
 * on a phone is materially better — more resolution, better optics — and a
 * reader with somebody to hold the phone should be able to use it.
 */
export const CAMERA_FACING_MODES = ['user', 'environment'] as const;

export type CameraFacing = (typeof CAMERA_FACING_MODES)[number];

export const DEFAULT_CAMERA_FACING: CameraFacing = 'user';

/**
 * The resolution asked for, as an ideal rather than an exact.
 *
 * Exact constraints are how a capture fails outright on a device that cannot
 * meet them: an OverconstrainedError instead of a slightly smaller picture.
 * Asking is free; insisting costs the photograph.
 *
 * 1920x1080 is chosen against what the output needs, not against what cameras
 * can do. A 35mm-wide print at 600dpi is around 827px, and the crop keeps well
 * under half the frame height, so 1080 rows leaves real headroom. Asking for
 * 4K would gain nothing a passport photo can use and would cost frame rate and
 * battery on exactly the mid-range phones this has to run on.
 */
export const REQUESTED_CAPTURE_WIDTH_PX = 1_920;
export const REQUESTED_CAPTURE_HEIGHT_PX = 1_080;

/**
 * Gap between analyses, measured from the end of the last one.
 *
 * Slower than it could be, deliberately. Detection on a mid-range phone takes
 * a couple of hundred milliseconds and the device is encoding video at the
 * same time; running flat out gains a smoother readout and costs battery,
 * heat, and eventually a thermally throttled camera that gets WORSE the longer
 * somebody spends framing the shot.
 *
 * 400ms is also about as fast as the instruction can usefully change. A person
 * cannot act on "move closer" more than twice a second, and an instruction
 * that flickers between two states is one nobody can follow.
 */
export const GUIDANCE_INTERVAL_MS = 400;

/** Longest edge of the buffer handed to the detector, per frame. */
export const GUIDANCE_FRAME_EDGE_PX = 640;

/** What the capture is encoded as. JPEG, because every specification wants one. */
export const CAPTURE_MIME_TYPE = 'image/jpeg';

/**
 * Encoding quality for the capture.
 *
 * High, and not 1.0. This photograph is re-encoded downstream against the
 * specification's byte budget, so quality lost here cannot be recovered — but
 * 1.0 buys nothing visible over 0.95 and produces a file several times larger
 * to hold in memory on a phone.
 */
export const CAPTURE_QUALITY = 0.95;

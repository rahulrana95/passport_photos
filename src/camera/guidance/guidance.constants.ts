/**
 * How much better than the bare minimum a live frame has to be.
 *
 * A still photograph is judged once, at rest. A live one is judged while
 * somebody is holding a phone at arm's length and breathing, and a frame that
 * is exactly at the limit is a frame that will be over it by the time the
 * shutter fires. Guiding to the limit produces a capture that fails the very
 * check the guidance was based on, which is the single most infuriating
 * outcome this feature could have.
 */
export const LIVE_RESOLUTION_MARGIN = 1.15;

/**
 * The same idea for the crop's fit inside the frame.
 *
 * Expressed as the share of the frame the crop may occupy before "step back"
 * appears. Below 1 by design: a crop that exactly fills the frame leaves no
 * room for the hand-shake between guidance and shutter.
 */
export const MAX_CROP_FRAME_OCCUPANCY = 0.94;

/**
 * Mean luminance below which guidance stops trusting itself.
 *
 * NOT an exposure judgement, and deliberately far below one — see
 * src/quality/exposure.utils.ts for why a band on face luminance is a band on
 * skin tone. This is about the detector: in a dark room the landmark model
 * still returns points, still returns a confidence, and is confidently wrong.
 * Telling somebody to move left on the strength of that is worse than telling
 * them the room is too dark.
 */
export const MIN_GUIDANCE_LUMINANCE = 40;

/**
 * Which point in a LandmarkResult is which.
 *
 * Written down here because the order was previously a comment inside the fake
 * detector, which is to say it was a convention that two consumers could
 * disagree about while both compiled. The geometry engine needs exactly three
 * points and everything downstream of it — the crop, the live guidance, the
 * report — is wrong in a way nobody would notice if a reader and a producer
 * ever swapped an eye for a chin.
 *
 * Coordinates at these indices are NORMALISED, 0–1, as every landmark model
 * reports them. Multiplying by the frame size is the caller's job, and the
 * frame in question differs — the still pipeline works in source pixels, the
 * camera in preview pixels.
 */
export const CHIN_POINT_INDEX = 0;
export const LEFT_EYE_POINT_INDEX = 1;
export const RIGHT_EYE_POINT_INDEX = 2;

/** How many points a result must carry before it can be measured from. */
export const REQUIRED_LANDMARK_POINTS = 3;

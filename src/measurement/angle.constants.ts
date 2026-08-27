/**
 * Angle conversions, in one place.
 *
 * These were written out three times before this file existed — in the pose
 * reader, the crop planner and the framing measurer — which is exactly the
 * duplication that lets one of them drift.
 */
export const HALF_TURN_DEGREES = 180;
export const DEGREES_PER_RADIAN = HALF_TURN_DEGREES / Math.PI;

/** Halving a span. Named so `/ HALF` reads as intent rather than as a literal. */
export const HALF = 2;

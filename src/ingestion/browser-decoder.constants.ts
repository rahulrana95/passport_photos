/**
 * The colour space a decode must land in.
 *
 * Stated explicitly rather than left to the default, because the default is
 * the right answer for the wrong reason and could change. The file this
 * product exports carries no colour profile, and a file with no profile is
 * read as sRGB by everything that opens it — so wide-gamut pixels labelled as
 * sRGB print with the saturation pushed up, on a photograph whose skin tones
 * an official is about to compare against a face.
 *
 * A modern phone photograph is often Display P3, and preserving that gamut is
 * the obviously higher-fidelity choice. It is also the wrong one here.
 */
export const DECODE_COLOUR_SPACE = 'srgb';

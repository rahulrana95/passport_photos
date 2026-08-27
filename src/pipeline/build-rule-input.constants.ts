/**
 * A segmentation mask value at or above this counts as subject.
 *
 * The masks these models produce are effectively binary at the edges, so the
 * exact midpoint matters far less than picking one and using it everywhere —
 * two thresholds in two files is how a background sample ends up containing
 * hair.
 */
export const SUBJECT_MASK_THRESHOLD = 128;

import { ACCEPTED_IMAGE_MIME_TYPES } from '@/constants/limits.constants';

/**
 * What the file picker offers.
 *
 * HEIC is in the list even though many browsers cannot decode it. Leaving it
 * out does not stop somebody choosing one — it stops the picker showing them
 * their own photographs on an iPhone, which is where most of them are.
 */
export const UPLOAD_ACCEPT = ACCEPTED_IMAGE_MIME_TYPES.join(',');

/**
 * Which camera the capture button asks for.
 *
 * 'user' is the front camera, which is the one somebody photographing
 * themselves wants. It is a hint rather than an instruction — several
 * browsers, iOS Safari among them, offer the choice anyway — and that is
 * fine: it costs a tap, where forcing the rear camera costs the photograph.
 */
export const CAPTURE_FACING = 'user';

/**
 * The capture input is SEPARATE from the file input, deliberately.
 *
 * Putting `capture` on the main picker is the common shortcut and it is
 * destructive: on a phone it removes the option to choose an existing
 * photograph entirely, so somebody who already took a good one is forced to
 * take a worse one on the spot. Two inputs, two buttons, both available.
 */
export const FILE_INPUT_ID = 'upload-zone-file';
export const CAPTURE_INPUT_ID = 'upload-zone-capture';

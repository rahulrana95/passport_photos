import type { ContentTree } from './content.types';

/**
 * All user-facing copy. No string destined for a screen may be written inline in
 * a component.
 *
 * Two rules govern the wording here, both enforced by en.content.test.ts:
 * nothing may promise that a photo will be accepted, and every error must tell
 * the reader what to do next rather than only what went wrong.
 */
export const EN_CONTENT: ContentTree = {
  common: {
    skipToContent: 'Skip to content',
    themeLabel: 'Colour theme',
    loading: 'Checking your photo',
    retry: 'Try again',
    close: 'Close',
  },
  upload: {
    dropzoneLabel: 'Drop your photo here',
    dropzoneHint: 'JPEG, PNG or WebP, up to 50 MB',
    browseLabel: 'Choose a photo',
    privacyNote: 'Your photo stays on your device. Nothing is uploaded.',
    errorTooLarge: 'That file is larger than 50 MB. Try exporting it at a smaller size and drop it in again.',
    errorWrongType: 'That file is not an image we can read. Use a JPEG, PNG or WebP.',
    errorTooSmall: 'That image is too small to print at the required size. Use the original from your camera rather than a copy from a chat app.',
    errorHeicUnsupported: 'Your browser cannot open HEIC photos. On iPhone, open Settings, then Camera, then Formats, and choose Most Compatible before retaking — or share the photo to yourself, which converts it to JPEG.',
    errorCorrupt: 'That file could not be opened. It may have been cut short during a download. Try the original again.',
  },
  result: {
    verdictPass: 'Meets the published requirements',
    verdictFail: 'Does not meet the requirements yet',
    verdictWarning: 'Close, but worth checking',
    verdictManual: 'You need to check this one yourself',
    verdictUndetectable: 'We could not measure this',
    manualChecklistHeading: 'Check these yourself',
    downloadDigital: 'Download photo',
    downloadPrintSheet: 'Download print sheet',
    downloadReport: 'Download report',
  },
  legal: {
    acceptanceDisclaimer:
      'We check your photo against the issuing authority’s published specification. The final decision always belongs to that authority.',
    privacyClaim: 'Your photo never leaves your device.',
    verifyPrivacyHint:
      'Open your browser’s developer tools and watch the Network tab while you run a check. You will not see your photo leave.',
    specVerifiedOn: 'Requirements last verified on',
  },
};

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
  errors: {
    notFoundTitle: 'That page does not exist',
    notFoundBody:
      'The link may be out of date, or the country you are looking for is not covered yet. Start from the checker and pick your document from there.',
    notFoundAction: 'Go to the photo checker',
    unexpectedTitle: 'Something went wrong on our side',
    unexpectedBody:
      'Your photo was not affected — nothing is ever uploaded, so nothing was lost. Try again, and if it keeps happening the details below will help us fix it.',
  },
  rules: {
    labels: {
      'single-subject': 'One person in the photo',
      'head-height': 'Head height',
      'eye-line': 'Eye position',
      'horizontal-centring': 'Centring',
      'eye-distance': 'Detail between the eyes',
      resolution: 'Photo size',
      focus: 'Focus',
      exposure: 'Exposure',
      'background-colour': 'Background colour',
      'background-uniformity': 'Plain background',
      'background-shadow': 'Shadow on the background',
      'head-tilt': 'Head tilt',
      'head-turn': 'Head turned',
      'head-pitch': 'Chin up or down',
      'eyes-open': 'Eyes open',
      'mouth-closed': 'Mouth closed',
      'neutral-expression': 'Expression',
      'head-covering-visible': 'Head covering',
      glasses: 'Glasses',
      'head-covering-policy': 'Hats and head coverings',
      'veil-over-face': 'Face uncovered',
      'hair-across-eyes': 'Hair away from the eyes',
      'ink-or-crease': 'Marks and creases',
      'photo-age': 'How recent the photo is',
    },
    messages: {
      'shared.pass': 'Within the published requirement.',
      'shared.unmeasured':
        'We could not measure this from your photo, so we are not able to say either way.',
      'shared.uncertain':
        'We measured this but not confidently enough to call it. Have a look yourself before you send the photo.',

      'geometry.crown-unmeasured':
        'We could not find the top of your head, so nothing measured from the crop is reliable. A plainer background behind you usually fixes this.',
      'geometry.head-not-in-frame':
        'Part of your head falls outside the photo, so there is no full head to measure. Take it again with a little space above your hair.',
      'geometry.crop-outside-source':
        'Cropping to the required shape would run off the edge of your photo. Take it again with more space around you.',
      'geometry.source-resolution-too-low':
        'Your photo does not have enough pixels to crop to the required print size. Use the original from your camera rather than a copy from a chat app.',
      'geometry.degenerate-geometry':
        'The landmarks we found do not describe a face we can measure. Take the photo again, facing the camera straight on.',

      'single-subject.multiple-faces':
        'There is more than one face in the photo. Take it again on your own.',
      'single-subject.no-face': 'We could not find a face in this photo.',
      'single-subject.too-small':
        'The face in this photo is too small to measure. Take it again from closer, or use a larger original.',
      'single-subject.touches-frame-edge':
        'The face runs to the edge of the photo, so part of it may be missing. Take it again with space on every side.',
      'single-subject.pose-unreliable':
        'The head is turned or tilted too far for us to measure anything reliably. Take it again facing the camera straight on.',

      'head-height.below': 'Your head is smaller in the photo than the requirement allows.',
      'head-height.above': 'Your head is larger in the photo than the requirement allows.',

      'eye-line.below': 'Your eyes sit lower in the photo than the requirement allows.',
      'eye-line.above': 'Your eyes sit higher in the photo than the requirement allows.',

      'horizontal-centring.left': 'You sit left of centre in the photo.',
      'horizontal-centring.right': 'You sit right of centre in the photo.',

      'eye-distance.too-few-pixels':
        'There is not enough detail between your eyes for a border system to read the photo later.',

      'resolution.too-small': 'This photo has fewer pixels than the requirement allows.',

      'focus.soft':
        'The face is not sharp. That can be a missed focus, camera shake or movement — the photo cannot tell us which.',
      'focus.too-small-to-judge':
        'There is too little of the face in view to judge whether it is sharp.',

      'exposure.clipped-shadows':
        'Part of the face is solid black, so the detail there is gone. This is about the light on the day, not about your skin tone.',
      'exposure.clipped-highlights':
        'Part of the face is pure white, so the detail there is gone. Softer, less direct light brings it back.',
      'exposure.flat':
        'The face has almost no range of tone left in it, which usually means the light was too dim or too harsh.',

      'background-colour.wrong-colour':
        'The background is not the colour this specification asks for.',
      'background-uniformity.not-uniform':
        'The background has pattern or texture in it where a plain one is required.',
      'background-shadow.shadowed':
        'One side of the background is darker than the other, which reads as your shadow falling on it.',
      'background.too-little-background':
        'There is too little background in view to judge it. Take the photo again with more space around you.',

      'head-tilt.tilted': 'Your head is tilted to one side.',
      'head-turn.turned': 'Your head is turned away from the camera.',
      'head-pitch.tilted':
        'Your chin is not level — it is tipped up or down. We can tell it is off level but not which way, so check the photo yourself.',

      'eyes-open.closed': 'Your eyes look closed, or caught mid-blink.',
      'mouth-closed.open': 'Your mouth looks open.',
      'neutral-expression.smiling':
        'You look like you are smiling. Most authorities ask for a neutral expression.',

      'head-covering-visible.may-include-covering':
        'The top of your head looks flat, which is usually a hat or a head covering — though a full head of hair can look the same to us. If you are wearing something on your head, the head height above may be measured to the top of it rather than to your head.',

      'glasses.prohibited':
        'Glasses are not allowed for this document. Take them off and take the photo again.',
      'glasses.no-glare':
        'Glasses are allowed here as long as your eyes are clearly visible and there is no reflection on the lenses. Check the photo at full size.',
      'glasses.permitted':
        'Glasses are allowed here. Check that your eyes are clearly visible through them.',

      'head-covering-policy.prohibited':
        'Hats and head coverings are not allowed for this document. Take anything off your head, then take the photo again.',
      'head-covering-policy.religious-only':
        'Head coverings are allowed here for religious reasons, as long as your face is visible from the bottom of your chin to your forehead.',
      'head-covering-policy.permitted':
        'Head coverings are allowed here, as long as your face is visible from the bottom of your chin to your forehead.',

      'veil-over-face.check':
        'Check that nothing covers your face itself in the photo.',
      'hair-across-eyes.check':
        'Check that no hair falls across your eyes. Both eyes need to be clearly visible.',
      'ink-or-crease.check':
        'If you are printing this photo, check the print for marks, creases or ink before you send it.',
      'photo-age.check':
        'This document needs a photo taken within the last {months}. Only you know when this one was taken.',
    },
    fixes: {
      'move-closer':
        'Move a little closer to the camera — your head needs to be about {amount} taller in the frame — and take the photo again.',
      'move-further':
        'Move back from the camera — your head needs to be about {amount} smaller in the frame — and take the photo again.',
      'eyes-higher-in-frame':
        'Your eyes need to sit about {amount} higher in the printed photo. Keep your head level and sit a little lower in the frame, then take it again.',
      'eyes-lower-in-frame':
        'Your eyes need to sit about {amount} lower in the printed photo. Keep your head level and sit a little higher in the frame, then take it again.',
      'shift-left':
        'You are about {amount} of the photo’s width right of centre. Line yourself up with the middle of the frame and take it again.',
      'shift-right':
        'You are about {amount} of the photo’s width left of centre. Line yourself up with the middle of the frame and take it again.',
      'retake-larger':
        'Take the photo again at a higher resolution, or use the original file from your camera rather than a copy that has been shrunk.',
      'retake-sharper':
        'Take the photo again. Rest the camera on something steady, and give it a moment to focus on your face before it fires.',
      'retake-more-light':
        'Take the photo again somewhere brighter — facing a window in daylight is usually enough.',
      'retake-softer-light':
        'Take the photo again out of direct light. Turn away from the lamp or the flash, or step back from the window.',
      'retake-even-light':
        'Take the photo again in even, indirect light — facing a window works well, with no lamp behind you.',
      'change-background-colour':
        'Take the photo again in front of a background of the colour this document asks for.',
      'use-plain-background':
        'Take the photo again in front of a plain wall, a door or a sheet, with nothing patterned behind you.',
      'move-from-wall':
        'Stand a step or two away from the wall and take the photo again. That is usually enough for your shadow to fall behind you rather than on it.',
      'straighten-head':
        'Your head is about {amount} off upright. Straighten it and take the photo again.',
      'face-camera':
        'Your head is turned about {amount} away from the camera. Face it straight on and take the photo again.',
      'level-chin':
        'Your chin is about {amount} off level. Look straight ahead at the lens and take the photo again.',
      'open-eyes': 'Take the photo again with both eyes open and looking at the camera.',
      'close-mouth': 'Take the photo again with your mouth closed.',
      'relax-expression':
        'Take the photo again with a relaxed, neutral expression and your mouth closed.',
      'remove-covering':
        'If you are wearing a hat, take it off and take the photo again. If it is there for religious reasons, check what this document allows.',
      'photograph-alone':
        'Take the photo again with nobody else in the frame — no faces in the background, and nothing face-like behind you.',
    },
    coverageKinds: {
      checked: 'We measure this',
      manual: 'You check this',
      undetectable: 'Cannot be judged from a photo',
      planned: 'Not built yet',
    },
    requirements: {
      'head-image-height-ratio': 'Head height within the photo',
      'head-image-width-ratio': 'Head width within the photo',
      'vertical-position-of-face': 'How high the face sits',
      'horizontal-position-of-face': 'How centred the face is',
      'eye-distance': 'Detail between the eyes',
      'roll-pitch-yaw': 'Head tilted, turned or nodded',
      blurred: 'Out of focus',
      pixelation: 'Too few pixels',
      'washed-out': 'Washed out',
      'too-dark-or-light': 'Too dark or too light',
      'unnatural-skin-tone': 'Unnatural skin tone',
      'ink-marked-creased': 'Ink marks or creases',
      'flash-reflection-on-skin': 'Flash reflecting off skin',
      'red-eyes': 'Red eye',
      posterisation: 'Colour banding',
      'varied-background': 'Patterned background',
      'unnatural-background-colour': 'Background colour',
      'shadows-behind-head': 'Shadow behind the head',
      'shadows-across-face': 'Shadow across the face',
      'eyes-closed': 'Eyes closed',
      'hair-across-eyes': 'Hair across the eyes',
      'dark-tinted-lenses': 'Tinted lenses',
      'flash-reflection-on-lenses': 'Reflection on glasses',
      'frames-too-heavy': 'Heavy frames',
      'frame-covering-eyes': 'Frames across the eyes',
      'hat-or-cap': 'Hat or head covering',
      'veil-over-face': 'Veil over the face',
      'mouth-open': 'Mouth open',
      'neutral-expression': 'Expression not neutral',
      'presence-of-other-faces': 'Other faces in the photo',
      'photo-age': 'How recently the photo was taken',
    },
    formats: {
      range: '{min} to {max}',
      minimum: 'at least {min}',
      pixels: '{value} px',
    },
  },
  overlay: {
    photoAlt: 'Your photo, with the crop and the measurements marked on it',
    legendHeading: 'What the marks mean',
    roles: {
      crop: 'What will be printed',
      'head-span': 'Your head, crown to chin',
      'head-band': 'Where the top of your head needs to reach',
      'eye-line': 'Your eye line',
      'eye-band': 'Where your eyes need to sit',
      'centre-line': 'Centre of the photo',
    },
    download: 'Download the marked-up photo',
    downloadFilename: 'photo-with-measurements.png',
    downloadFailed:
      'Your browser could not build the marked-up image, which usually means the photo is larger than it will open on a canvas. The measurements above are unaffected.',
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

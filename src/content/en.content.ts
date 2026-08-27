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
    takePhotoLabel: 'Take a photo',
    pasteHint: 'You can also paste a photo straight from your clipboard.',
    busyNote: 'Still checking your last photo. Drop another and we will start again on that one.',
    usedFirstOfMany: 'You dropped several files. We are using the first one.',
    nothingDropped:
      'That did not contain a photo. Folders and links cannot be read — drop the image file itself.',
    failures: {
      'empty-file': {
        message: 'That file is empty.',
        remedy:
          'It may not have finished copying or downloading. Check the file opens on your device, then try again.',
      },
      'too-large': {
        message: 'That file is {size}, over the {limit} limit.',
        remedy:
          'This is usually a RAW file from a camera. Export it as a JPEG first — any photo app will do it, and the quality is more than enough for a passport photo.',
      },
      'unrecognised-format': {
        message: 'That does not look like an image file.',
        remedy:
          'Check you picked the photo itself rather than a document, an archive, or a shortcut to it. JPEG, PNG and HEIC all work.',
      },
      'format-not-supported': {
        message: '{format} files cannot be read here.',
        remedy:
          'Open the photo on your device and export or save it as a JPEG, then upload that. Every phone and photo app can do this.',
      },
      'heic-not-decodable': {
        message: 'This browser cannot open HEIC photos, which is how iPhones save them by default.',
        remedy:
          'On iPhone: open the photo in Photos, tap Share, choose Copy Photo, and paste it here — iOS converts it to JPEG automatically. On a computer: open it in Preview or Photos and export as JPEG. Or upload from your iPhone directly, where this works without converting.',
      },
      'decode-failed': {
        message: 'That image could not be opened — the file looks damaged or incomplete.',
        remedy:
          'Try sending the photo to yourself again, or pick a different one. A file that stopped partway through a download or transfer will do this.',
      },
      'too-small': {
        message: 'That image is {width}x{height} pixels, too small to print at passport quality.',
        remedy:
          'Use the original photo rather than a copy saved from a message or a website — those are shrunk. The shorter side needs at least {minimum} pixels.',
      },
      'too-large-dimensions': {
        message: 'That image is {width}x{height} pixels, beyond what a browser can open.',
        remedy:
          'Resize it so neither side is over {maximum} pixels, or export it again at a normal photo size.',
      },
      'animated-source': {
        message: 'That is an animated image, not a photograph.',
        remedy: 'Upload a still photo of your face — a JPEG or PNG straight from the camera.',
      },
    },
  },
  camera: {
    startLabel: 'Use my camera',
    stopLabel: 'Turn the camera off',
    captureLabel: 'Take the photo',
    switchCameraLabel: 'Switch camera',
    previewLabel: 'Camera preview',
    fallbackToUpload: 'Upload a photo instead',
    headHeightReadout: 'Head fills {percent}% of the frame',
    guidance: {
      'no-face': 'Looking for your face',
      'many-faces': 'Only you should be in the picture',
      'crown-hidden': 'Show the top of your head',
      'head-cut-off': 'Fit your whole head in the frame',
      'move-back': 'Move back a little',
      'move-closer': 'Move a little closer',
      'move-left': 'Move to your left',
      'move-right': 'Move to your right',
      'raise-camera': 'Raise the camera',
      'lower-camera': 'Lower the camera',
      'level-head': 'Hold your head level',
      'face-camera': 'Look straight at the camera',
      'too-dark': 'Find somewhere brighter',
      'plain-background': 'Stand against a plain wall',
      ready: 'Hold still',
    },
    failures: {
      'permission-denied': {
        message: 'Your browser is blocking camera access for this page.',
        remedy:
          'Look for the camera icon in the address bar and allow access, then try again. Nothing is recorded or sent anywhere — the picture is analysed on your device.',
      },
      'no-camera': {
        message: 'No camera was found on this device.',
        remedy: 'Take a photo on your phone and upload it here instead. That works just as well.',
      },
      'camera-in-use': {
        message: 'The camera is already being used by another app.',
        remedy:
          'Close any video call or camera app that is open, then try again. On a laptop this is usually a meeting window you have forgotten about.',
      },
      'insecure-context': {
        message: 'The camera only works on a secure connection.',
        remedy: 'Open this page over https and the camera button will work.',
      },
      unsupported: {
        message: 'This browser cannot open a camera.',
        remedy:
          'Upload a photo instead, or open this page in Chrome, Safari, Firefox or Edge, where the camera works.',
      },
      'constraints-unsatisfiable': {
        message: 'That camera could not be opened at a usable size.',
        remedy: 'Try the other camera, or upload a photo you have already taken.',
      },
      dismissed: {
        message: 'The camera permission prompt was closed without an answer.',
        remedy: 'Press the camera button again and choose Allow, or upload a photo instead.',
      },
      unknown: {
        message: 'The camera could not be started.',
        remedy:
          'Try again, or upload a photo instead — the checks are exactly the same either way.',
      },
    },
  },
  checker: {
    heading: 'Check your passport photo',
    intro:
      'Choose the document you are applying for, then add your photo. Every check runs on your own device — the photo is never uploaded.',
    specLegend: 'What are you applying for?',
    specOption: '{country} {document}',
    startOver: 'Check another photo',
    privacyHeading: 'Your photo stays on your device',
    privacyBody:
      'The checks run in your browser. Nothing is sent to a server, nothing is stored, and closing the tab removes it. You can disconnect from the internet after the page loads and it will still work.',
  },
  result: {
    verdictPass: 'Meets the published requirements',
    verdictFail: 'Does not meet the requirements yet',
    verdictWarning: 'Close, but worth checking',
    verdictManual: 'You need to check this one yourself',
    verdictUndetectable: 'We could not measure this',
    statuses: {
      pass: 'Meets it',
      fail: 'Does not meet it',
      warning: 'Borderline',
      manual: 'Check yourself',
      undetectable: 'Not measured',
    },
    manualChecklistHeading: 'Check these yourself',
    downloadDigital: 'Download photo',
    downloadPrintSheet: 'Download print sheet',
    downloadReport: 'Download report',
    resultsHeading: 'What we checked',
    downloadsHeading: 'Downloads',
    analysingLabel: 'Checking your photo',
    stages: {
      decoding: 'Reading your photo',
      'detecting-face': 'Finding your face',
      segmenting: 'Finding the edges of your head',
      measuring: 'Measuring against the requirements',
      'checking-quality': 'Checking sharpness, exposure and background',
    },
    completeAnnouncement: 'Check complete. {verdict}',
    retryLabel: 'Try again',
    failures: {
      'no-face-detected': {
        message: 'We could not find a face in that photo.',
        remedy:
          'Use a photo taken straight on, with your whole head in frame and nothing covering your face. A photo of a photo often fails here.',
      },
      'multiple-faces': {
        message: 'There is more than one face in that photo.',
        remedy:
          'Crop the photo so only you are in it, or take a new one on a plain background with nobody behind you.',
      },
      'detector-unavailable': {
        message: 'The checks could not be loaded.',
        remedy:
          'This usually means the connection dropped part-way. Reload the page and try again — nothing you did was wrong.',
      },
      'out-of-memory': {
        message: 'That photo was too large for this device to analyse.',
        remedy:
          'Close a few other tabs and try again, or use a smaller copy of the photo. Phone cameras often save at far more detail than a passport photo needs.',
      },
      timeout: {
        message: 'The checks took too long and were stopped.',
        remedy:
          'Try again — a slower device sometimes needs a second run. If it keeps happening, a smaller copy of the photo will go through.',
      },
      'worker-crashed': {
        message: 'The checks stopped unexpectedly.',
        remedy: 'Try again. If it happens twice, reload the page first.',
      },
      'worker-unavailable': {
        message: 'This browser cannot run the checks.',
        remedy:
          'Open this page in Chrome, Safari, Firefox or Edge. The checks run on your device, so they need a browser that supports background processing.',
      },
      cancelled: {
        message: 'The check was stopped.',
        remedy: 'Choose a photo to start again.',
      },
      unknown: {
        message: 'Something went wrong during the checks.',
        remedy: 'Try again. Your photo never left your device, so nothing was lost.',
      },
    },
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
  print: {
    sheetHeading: 'Print a sheet',
    sheetSizes: {
      '4x6in': '4 x 6 inches',
      '10x15cm': '10 x 15 cm',
      a4: 'A4',
    },
    copiesPerSheet: '{count} copies on one sheet',
    downloadJpeg: 'Download the sheet as an image',
    downloadPdf: 'Download the sheet as a PDF',
    cutGuidesNote:
      'The small marks sit outside each photo, never across it. Cut along them and nothing on the photo is lost.',
    scaleWarning:
      'Print at 100%. Any “fit to page” or “scale to fit” setting resizes the photos, and a photo of the wrong size is the most common reason one is refused.',
    tooLargeForSheet:
      'This photo is larger than that sheet. Choose a bigger sheet, or print a single photo instead.',
    handoffHeading: 'Taking it to a shop',
    handoffSteps: [
      'Download the sheet as an image and put it on your phone, or on a USB stick.',
      'Ask for a single 6x4 photo print of that file — not a passport photo, which is a different and far more expensive service.',
      'Check at the counter that it was printed at full size and not cropped or resized.',
      'Cut along the small marks at the corners of each photo.',
    ],
    printersHeading: 'Shops that print photos near you',
    printersNote:
      'These are chains people recognise, listed because they print photos from a file. Nobody has paid to be here, and if that ever changes it will say so on this page.',
    printersUnknown:
      'We do not have shop suggestions for this country yet. Any photo shop, print shop or stationery shop that prints from a file will do it — ask for a 6x4 photo print.',
  },
  report: {
    title: 'Photo compliance report',
    checkedOn: 'Checked on {date}',
    overallHeading: 'What we found',
    resultsHeading: 'Every check we ran',
    checklistHeading: 'Checks only you can make',
    coverageHeading: 'What this report covers',
    coverageSummary:
      'Of {total} published requirements: {checked} measured, {manual} for you to check, {undetectable} that cannot be judged from a photo, {planned} not built yet.',
    sourceHeading: 'Where these requirements come from',
    sourceVerified: 'Last checked against that page on {date}',
    requirementLabel: 'Required',
    pageLabel: 'Page {page} of {total}',
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

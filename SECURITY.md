# Security and data handling

## What this application does with your photo

Nothing leaves your device. Images are decoded, measured and encoded entirely in
the browser, in a Web Worker. There is no upload endpoint, no image storage, and
no server-side processing of any kind.

You can verify this yourself: open the browser's developer tools, switch to the
Network tab, and run a check. The only requests you will see are for the page
itself and — once, on first use — the analysis models. No request carries your
image.

## Why this matters more than usual

A passport photo is biometric data. Under GDPR Article 9 that is special-category
data, subject to stricter handling than ordinary personal data. Services that
upload these images take on that obligation. This one does not, because it never
receives the data in the first place.

## Invariants

These are architectural commitments, not preferences:

- No user image, and no derivative of one (landmarks, masks, embeddings,
  measurements tied to an image), is ever transmitted anywhere.
- EXIF metadata, including GPS coordinates, is stripped from every output file.
- Analytics may record that a check ran and which rule failed. It may never
  record anything derived from the image itself.
- No accounts, no persistence of user images in any storage layer.

## Reporting a vulnerability

Open a private security advisory on this repository. Please do not open a public
issue for anything that could expose user data.

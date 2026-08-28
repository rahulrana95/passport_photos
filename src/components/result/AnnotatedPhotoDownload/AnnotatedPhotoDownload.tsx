'use client';

import { Button } from '@mantine/core';
import { useState } from 'react';
import { getContent } from '@/content/content.registry';
import { buildAnnotatedPng } from '@/overlay/download-annotated';
import { trackEvent } from '@/analytics/track-event';
import { vercelTransport } from '@/analytics/vercel-transport';
import { saveBlob } from '@/overlay/save-blob.utils';
import type { AnnotatedPhotoDownloadProps } from './AnnotatedPhotoDownload.types';
import styles from './AnnotatedPhotoDownload.module.css';

/**
 * Saves the photograph with its measurements drawn on, at full resolution.
 *
 * Composed on demand rather than kept ready. The export is a second copy of the
 * original at full size — on a phone with a forty-megapixel camera that is a
 * lot of memory to hold against a button nobody may press.
 *
 * A failure is reported in place rather than thrown away or thrown upward. The
 * realistic cause is a photograph larger than the browser will open on a
 * canvas, which is not an error in any useful sense: the measurements on screen
 * are unaffected, and the reader needs to be told that this one button did not
 * work rather than shown an error page over a result that is fine.
 */
export const AnnotatedPhotoDownload = ({
  image,
  source,
  instructions,
  createCanvas,
  track = vercelTransport,
}: AnnotatedPhotoDownloadProps): React.JSX.Element => {
  const content = getContent();
  const [failed, setFailed] = useState(false);
  const [working, setWorking] = useState(false);

  const onClick = async (): Promise<void> => {
    setWorking(true);
    setFailed(false);

    const canvas = createCanvas === undefined ? document.createElement('canvas') : createCanvas();
    const blob = await buildAnnotatedPng(canvas, image, source, instructions);

    if (blob === undefined) setFailed(true);
    else {
      // Only on the path that produced a file. Counting the click instead
      // would count the failures too, and the number is worth having
      // precisely because it says how many people got something out.
      saveBlob(blob, content.overlay.downloadFilename, document);
      trackEvent({ name: 'photo-downloaded' }, track);
    }

    setWorking(false);
  };

  return (
    <div className={styles['action']}>
      <Button
        type="button"
        variant="default"
        loading={working}
        onClick={() => {
          void onClick();
        }}
      >
        {content.overlay.download}
      </Button>
      {failed ? <p className={styles['note']}>{content.overlay.downloadFailed}</p> : null}
    </div>
  );
};

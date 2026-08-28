'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getContent } from '@/content/content.registry';
import { validateCandidateFile } from '@/ingestion/file-validation.utils';
import { resolveIngestionFailure } from '@/ingestion/resolve-failure.utils';
import { filesFrom, selectDroppedFile } from '@/upload/dropped-file.utils';
import { readFileHeader } from '@/upload/read-header.utils';
import {
  CAPTURE_FACING,
  CAPTURE_INPUT_ID,
  FILE_INPUT_ID,
  UPLOAD_ACCEPT,
} from './UploadZone.constants';
import type { IngestionFailure } from '@/ingestion/ingestion-failure.types';
import type { UploadZoneProps } from './UploadZone.types';
import styles from './UploadZone.module.css';

/**
 * Where a photograph comes in.
 *
 * Four ways, because people arrive with the file in four different places: on
 * disk, in a folder they are dragging, on a clipboard they just copied it to,
 * or still in front of the camera. Supporting three of them and not the fourth
 * is how somebody bounces.
 *
 * PASTE MATTERS MORE THAN IT LOOKS. On an iPhone the way to turn a HEIC into
 * something a desktop browser can read is Share, Copy Photo, paste — iOS
 * converts it in the process. Our own HEIC advice tells people to do exactly
 * that, and it only works if this listens.
 */
export const UploadZone = ({
  onFile,
  onWarmUp,
  busy = false,
  failure: reportedFailure,
  onRejected,
  onUseCamera,
}: UploadZoneProps): React.JSX.Element => {
  const content = getContent();
  const [dragDepth, setDragDepth] = useState(0);
  const [detected, setDetected] = useState<IngestionFailure | undefined>(undefined);
  const [note, setNote] = useState<string | undefined>(undefined);
  const warmed = useRef(false);

  const accept = useCallback(
    async (files: readonly File[]): Promise<void> => {
      setDetected(undefined);
      setNote(undefined);

      const selection = selectDroppedFile(files);
      if (selection.kind === 'none') {
        setNote(content.upload.nothingDropped);
        return;
      }

      if (selection.ignored > 0) setNote(content.upload.usedFirstOfMany);

      // Only the leading bytes. A phone photograph is tens of megabytes and
      // the format check needs thirty-two of them.
      const header = await readFileHeader(selection.file);
      const result = validateCandidateFile({ byteLength: selection.file.size, header });

      if (!result.ok) {
        setDetected(result.failure);
        onRejected?.(result.failure);
        return;
      }

      onFile(selection.file);
    },
    [content, onFile, onRejected],
  );

  useEffect(() => {
    // Two jobs, one listener. A photograph dropped anywhere ELSE on the page
    // would otherwise replace it with the image, losing whatever the reader
    // had done so far — the browser's default for a dropped file is to
    // navigate to it. And a dragover that is not prevented anywhere means the
    // browser refuses the drop outright, so this is also what makes the zone
    // droppable at all. There is deliberately no second preventDefault on the
    // zone itself: this one already runs for dragovers over it, and a
    // component with two mechanisms for one job has one nobody maintains.
    const swallow = (event: DragEvent): void => {
      event.preventDefault();
    };

    window.addEventListener('dragover', swallow);
    window.addEventListener('drop', swallow);

    return () => {
      window.removeEventListener('dragover', swallow);
      window.removeEventListener('drop', swallow);
    };
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent): void => {
      const files = filesFrom(event.clipboardData?.files);
      if (files.length === 0) return;

      event.preventDefault();
      void accept(files);
    };

    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('paste', onPaste);
    };
  }, [accept]);

  // What was just chosen outranks what the caller is still reporting about the
  // last file, so the reader is never told two different things at once.
  const failure = detected ?? reportedFailure;
  const resolved = failure === undefined ? undefined : resolveIngestionFailure(failure);

  return (
    <div
      className={styles['zone']}
      // Counted, not toggled. dragleave fires every time the pointer crosses
      // into a child element, so a boolean set by the last event flickers the
      // highlight off while the pointer is still inside the zone — the classic
      // bug, and the reason this is a number.
      data-dragging={dragDepth > 0}
      data-busy={busy}
      onDragEnter={() => {
        setDragDepth((depth) => depth + 1);
      }}
      onDragLeave={() => {
        setDragDepth((depth) => Math.max(0, depth - 1));
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragDepth(0);
        void accept(filesFrom(event.dataTransfer.files));
      }}
      onPointerEnter={() => {
        if (warmed.current) return;
        warmed.current = true;
        onWarmUp?.();
      }}
    >
      <p className={styles['heading']}>{content.upload.dropzoneLabel}</p>
      <p className={styles['hint']}>{content.upload.dropzoneHint}</p>

      <div className={styles['actions']}>
        <input
          className={styles['input']}
          id={FILE_INPUT_ID}
          type="file"
          accept={UPLOAD_ACCEPT}
          onChange={(event) => {
            void accept(filesFrom(event.target.files));
          }}
        />
        <label className={styles['button']} htmlFor={FILE_INPUT_ID}>
          {content.upload.browseLabel}
        </label>

        {/* Two ways to take a photograph, and which one is right depends on
            the device rather than on us. A live camera can guide the framing
            before the shutter, which is the whole point of this product — but
            it needs getUserMedia. `capture` needs nothing and opens the
            phone's own camera at full sensor resolution — but every desktop
            browser ignores it, so the button becomes a second file picker
            that appears to do nothing. The caller knows which it can offer.

            Separate from the picker above either way: putting `capture` on
            that one would remove the option to choose an existing photograph
            on a phone entirely, forcing somebody who already has a good one to
            take a worse one on the spot. */}
        {onUseCamera === undefined ? (
          <>
            <input
              className={styles['input']}
              id={CAPTURE_INPUT_ID}
              type="file"
              accept={UPLOAD_ACCEPT}
              capture={CAPTURE_FACING}
              onChange={(event) => {
                void accept(filesFrom(event.target.files));
              }}
            />
            <label className={styles['button']} htmlFor={CAPTURE_INPUT_ID}>
              {content.upload.takePhotoLabel}
            </label>
          </>
        ) : (
          <button
            className={styles['button']}
            type="button"
            data-track="upload-use-camera"
            onClick={onUseCamera}
          >
            {content.upload.takePhotoLabel}
          </button>
        )}
      </div>

      <p className={styles['hint']}>{content.upload.pasteHint}</p>
      <p className={styles['privacy']}>{content.upload.privacyNote}</p>

      <div role="status" aria-live="polite">
        {busy ? <p className={styles['note']}>{content.upload.busyNote}</p> : null}
        {note === undefined ? null : <p className={styles['note']}>{note}</p>}
        {resolved === undefined ? null : (
          <div className={styles['failure']}>
            <p className={styles['failureMessage']}>{resolved.message}</p>
            <p className={styles['remedy']}>{resolved.remedy}</p>
          </div>
        )}
      </div>
    </div>
  );
};

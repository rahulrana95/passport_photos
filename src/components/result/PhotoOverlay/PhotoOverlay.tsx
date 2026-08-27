'use client';

import { useEffect, useState } from 'react';
import { getContent } from '@/content/content.registry';
import { AnnotatedPhotoDownload } from '../AnnotatedPhotoDownload/AnnotatedPhotoDownload';
import { OverlayLegend } from '../OverlayLegend/OverlayLegend';
import { legendItemsFor } from '@/overlay/legend-items.utils';
import { paintOverlayCanvas } from '@/overlay/paint-canvas';
import { EMPTY_OVERLAY_SIZE } from './PhotoOverlay.constants';
import { aspectStyle } from './PhotoOverlay.utils';
import type { OverlaySize } from '@/overlay/overlay-transform.utils';
import type { DecodedPhoto, PhotoOverlayProps } from './PhotoOverlay.types';
import styles from './PhotoOverlay.module.css';

/**
 * The photograph with its measurements drawn over it.
 *
 * A plain <img> under a <canvas>, rather than the photograph painted into the
 * canvas as well. Two reasons, and the first is the one that matters: an <img>
 * has alt text and a canvas does not, so drawing the photograph into the canvas
 * would leave a reader using a screen reader with nothing at all where their
 * own photograph is.
 *
 * The second is that the browser decodes, scales and colour-manages an <img>
 * better than a drawImage call does, and it does it off the main thread.
 *
 * The canvas therefore holds only the annotations, and lining the two up is
 * this component's actual job — which is why the frame is given the source's
 * aspect ratio and the annotations are fitted with the same contain arithmetic
 * the browser applies to the image.
 */
export const PhotoOverlay = ({
  imageSrc,
  sourceWidthPx,
  sourceHeightPx,
  instructions,
}: PhotoOverlayProps): React.JSX.Element => {
  const content = getContent();
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  // The decoded photograph, remembered ALONGSIDE the source it was decoded
  // from. Two reasons, and the second is the one that shaped this.
  //
  // drawImage on an image the browser has not finished decoding draws nothing,
  // so exporting before the load event would produce a blank frame with the
  // measurements neatly drawn on it — the most convincing wrong output this
  // component could make.
  //
  // And checking a second photo is the whole loop of this product. Carrying
  // the source alongside the element makes "is this still the photograph on
  // screen?" a comparison at render time rather than a reset that has to be
  // remembered: the element is reused across sources, so there is nothing
  // about the element itself that changes when a new one starts loading.
  const [decoded, setDecoded] = useState<DecodedPhoto | null>(null);
  const [container, setContainer] = useState<OverlaySize>(EMPTY_OVERLAY_SIZE);

  // Callback refs into state rather than useRef, so the effects below re-run
  // when the elements appear. A ref object does not notify anything when it is
  // populated, and an effect reading one on mount is a race that happens to
  // win — until a Suspense boundary or a conditional render makes it lose.
  useEffect(() => {
    if (frame === null) return undefined;

    // ResizeObserver rather than a window resize listener: the frame changes
    // size when a sidebar opens, when the legend below it wraps to another
    // line, or when the phone rotates, and only one of those is a window
    // resize. Redrawing is a transform and a repaint — the analysis that
    // produced these instructions is never re-run.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainer({
          widthPx: entry.contentRect.width,
          heightPx: entry.contentRect.height,
        });
      }
    });

    observer.observe(frame);
    return () => {
      observer.disconnect();
    };
  }, [frame]);

  useEffect(() => {
    if (canvas === null) return;

    paintOverlayCanvas(
      canvas,
      instructions,
      { widthPx: sourceWidthPx, heightPx: sourceHeightPx },
      container,
      window.devicePixelRatio,
    );
  }, [canvas, container, instructions, sourceWidthPx, sourceHeightPx]);

  return (
    <figure className={styles['figure']}>
      <div
        className={styles['frame']}
        style={aspectStyle(sourceWidthPx, sourceHeightPx)}
        ref={setFrame}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image
            optimises through a remote loader, and this photograph is an object
            URL that must never leave the device. There is nothing to optimise
            and nowhere to send it. */}
        <img
          className={styles['photo']}
          src={imageSrc}
          alt={content.overlay.photoAlt}
          width={sourceWidthPx}
          height={sourceHeightPx}
          onLoad={(event) => {
            setDecoded({ element: event.currentTarget, src: imageSrc });
          }}
        />
        <canvas className={styles['canvas']} ref={setCanvas} aria-hidden="true" />
      </div>
      <OverlayLegend items={legendItemsFor(instructions)} />
      {decoded === null || decoded.src !== imageSrc ? null : (
        <AnnotatedPhotoDownload
          image={decoded.element}
          source={{ widthPx: sourceWidthPx, heightPx: sourceHeightPx }}
          instructions={instructions}
        />
      )}
    </figure>
  );
};

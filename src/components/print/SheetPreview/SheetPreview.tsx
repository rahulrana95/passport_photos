import { getContent } from '@/content/content.registry';
import { photoStyle, sheetStyle, slotStyle } from './SheetPreview.utils';
import type { SheetPreviewProps } from './SheetPreview.types';
import styles from './SheetPreview.module.css';

/**
 * What the printed sheet will look like.
 *
 * Worth showing rather than describing. "Six copies on a 4x6 sheet" is a
 * sentence somebody has to picture; the picture answers the questions they
 * would otherwise have to ask — how much gets cut away, whether the
 * photographs come out sideways, whether the sheet is the one they meant.
 */
export const SheetPreview = ({ plan, photoSrc }: SheetPreviewProps): React.JSX.Element => {
  const content = getContent();

  return (
    <div
      className={styles['sheet']}
      style={sheetStyle(plan)}
      role="img"
      aria-label={content.print.copiesPerSheet.replace('{count}', String(plan.count))}
    >
      {plan.slots.map((slot) => (
        <div
          key={`${slot.xMm}-${slot.yMm}`}
          className={styles['slot']}
          style={slotStyle(plan, slot)}
          data-slot
        >
          {photoSrc === undefined ? null : (
            /* next/image optimises through a remote loader, and this is an
               object URL for a photograph that must never leave the device.
               There is nothing to optimise and nowhere to send it. */
            /* eslint-disable-next-line @next/next/no-img-element -- see above */
            <img className={styles['photo']} src={photoSrc} alt="" style={photoStyle(plan)} />
          )}
        </div>
      ))}
    </div>
  );
};

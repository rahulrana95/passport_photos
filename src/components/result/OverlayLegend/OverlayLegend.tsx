import { getContent } from '@/content/content.registry';
import { swatchStyle } from './OverlayLegend.utils';
import type { OverlayLegendProps } from './OverlayLegend.types';
import styles from './OverlayLegend.module.css';

/**
 * The key to the marks drawn on the photograph.
 *
 * Real text in the DOM rather than labels baked into the canvas, which is the
 * whole reason the overlay draws no text of its own: a caption inside a bitmap
 * cannot be read aloud, cannot be selected or translated, does not reflow on a
 * narrow screen, and would have to be sized against the photograph's resolution
 * instead of the reader's font size.
 */
export const OverlayLegend = ({ items }: OverlayLegendProps): React.JSX.Element => {
  const content = getContent();

  return (
    <div className={styles['legend']}>
      <h3 className={styles['heading']}>{content.overlay.legendHeading}</h3>
      <ul className={styles['items']}>
        {items.map(({ role, style }) => (
          <li key={role} className={styles['item']}>
            <span className={styles['swatch']} aria-hidden="true">
              <span
                className={styles['rule']}
                style={swatchStyle(style.colour)}
                data-dashed={style.dashPx.length > 0}
              />
            </span>
            {content.overlay.roles[role]}
          </li>
        ))}
      </ul>
    </div>
  );
};

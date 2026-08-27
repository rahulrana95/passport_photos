import { getContent } from '@/content/content.registry';
import { printersFor } from '@/print/printer-registry';
import type { PrintHandoffProps } from './PrintHandoff.types';
import styles from './PrintHandoff.module.css';

/**
 * How to turn the file into a printed photograph.
 *
 * The half of the job software cannot do. Most people who need a passport
 * photograph need a physical one, and a product that hands over a perfect file
 * and stops has solved the interesting part of the problem and left the part
 * they were stuck on.
 *
 * The instructions are specific because the counter is where it goes wrong:
 * asking for "a passport photo" gets a different and far more expensive
 * service than asking for a 6x4 print of a file, and any "fit to page" the
 * assistant leaves on resizes every photograph on the sheet.
 */
export const PrintHandoff = ({ country }: PrintHandoffProps): React.JSX.Element => {
  const content = getContent();
  const printers = printersFor(country);

  return (
    <section className={styles['handoff']}>
      <h2 className={styles['heading']}>{content.print.handoffHeading}</h2>
      <ol className={styles['steps']}>
        {content.print.handoffSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3 className={styles['subheading']}>{content.print.printersHeading}</h3>
      {printers.length === 0 ? (
        <p className={styles['note']}>{content.print.printersUnknown}</p>
      ) : (
        <>
          <ul className={styles['printers']}>
            {printers.map((printer) => (
              <li key={printer.name} className={styles['printer']}>
                {printer.name}
                <span className={styles['service']}>{printer.service}</span>
              </li>
            ))}
          </ul>
          {/* Said in the interface, not buried in a policy page. A suggestion
              that is quietly a paid placement is the thing this product exists
              in opposition to. */}
          <p className={styles['note']}>{content.print.printersNote}</p>
        </>
      )}
    </section>
  );
};

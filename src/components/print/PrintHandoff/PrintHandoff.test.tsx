import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { printersFor } from '@/print/printer-registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { PrintHandoff } from './PrintHandoff';

const content = getContent();

describe('PrintHandoff', () => {
  it('spells out every step of taking it to a shop', () => {
    render(<PrintHandoff country="us" />);

    for (const step of content.print.handoffSteps) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });

  it('tells the reader to ask for a print rather than a passport photo', () => {
    // The counter is where it goes wrong. Asking for the wrong thing gets a
    // photograph taken on the spot at ten times the price.
    render(<PrintHandoff country="us" />);

    expect(screen.getByText(/not a passport photo/i)).toBeInTheDocument();
  });

  it('names shops for a country we know', () => {
    render(<PrintHandoff country="uk" />);

    for (const printer of printersFor('uk')) {
      expect(screen.getByText(printer.name)).toBeInTheDocument();
    }
  });

  it('says plainly that nobody paid to be on the list', () => {
    // In the interface, not buried in a policy page.
    render(<PrintHandoff country="us" />);

    expect(screen.getByText(content.print.printersNote)).toBeInTheDocument();
  });

  it('gives honest generic advice where it cannot name shops', () => {
    render(<PrintHandoff country="japan" />);

    expect(screen.getByText(content.print.printersUnknown)).toBeInTheDocument();
  });

  it('makes no claim about shops it does not know', () => {
    render(<PrintHandoff country="japan" />);

    expect(screen.queryByText(content.print.printersNote)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PrintHandoff country="us" />);

    await expectNoAxeViolations(container);
  });
});

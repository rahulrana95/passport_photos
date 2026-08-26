import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { RequirementsTable } from './RequirementsTable';
import type { RequirementRow } from './RequirementsTable.types';

const ROWS: readonly RequirementRow[] = [
  { label: 'Photo size', value: '51 × 51 mm' },
  { label: 'Head height', value: '25–35 mm', note: 'Measured from chin to the top of the head.' },
  { label: 'Background', value: 'Plain white or off-white' },
];

const content = getContent();

describe('RequirementsTable', () => {
  it('renders a caption naming what the table describes', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} />);

    expect(screen.getByRole('table', { name: 'US passport photo' })).toBeInTheDocument();
  });

  it('renders every requirement as a labelled row', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} />);

    for (const row of ROWS) {
      expect(screen.getByRole('rowheader', { name: row.label })).toBeInTheDocument();
      expect(screen.getByText(row.value)).toBeInTheDocument();
    }
  });

  it('scopes each row header, so screen readers can associate value with label', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} />);

    for (const header of screen.getAllByRole('rowheader')) {
      expect(header).toHaveAttribute('scope', 'row');
    }
  });

  it('shows a note when one is given', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} />);

    expect(screen.getByText(/measured from chin/i)).toBeInTheDocument();
  });

  it('omits the provenance line entirely when no verification date is known', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} />);

    expect(screen.queryByText(new RegExp(content.legal.specVerifiedOn))).toBeNull();
  });

  it('shows the verification date as a machine-readable time element', () => {
    const { container } = render(
      <RequirementsTable caption="US passport photo" rows={ROWS} verifiedOn="2026-08-20" />,
    );

    expect(container.querySelector('time')).toHaveAttribute('dateTime', '2026-08-20');
  });

  it('links the official source when one is given', () => {
    render(
      <RequirementsTable
        caption="US passport photo"
        rows={ROWS}
        verifiedOn="2026-08-20"
        sourceUrl="https://travel.state.gov/example"
      />,
    );

    const link = screen.getByRole('link', { name: /official source/i });
    expect(link).toHaveAttribute('href', 'https://travel.state.gov/example');
    expect(link).toHaveAttribute('rel', expect.stringContaining('nofollow'));
  });

  it('shows the date without a link when the source URL is unknown', () => {
    render(<RequirementsTable caption="US passport photo" rows={ROWS} verifiedOn="2026-08-20" />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('2026-08-20')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <RequirementsTable
        caption="US passport photo"
        rows={ROWS}
        verifiedOn="2026-08-20"
        sourceUrl="https://travel.state.gov/example"
      />,
    );

    await expectNoAxeViolations(container);
  });
});

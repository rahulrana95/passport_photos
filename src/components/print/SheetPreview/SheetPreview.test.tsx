import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { planSheet } from '@/sheet/sheet-layout.utils';
import { SHEET_SIZES } from '@/sheet/sheet-size.constants';
import { expectNoAxeViolations } from '@/testing/axe.utils';
import { SAMPLE_PHOTO_LIGHT } from '@/testing/fixtures/sample-photo.constants';
import { SheetPreview } from './SheetPreview';
import type { SheetPlan } from '@/sheet/sheet-layout.types';

const planFor = (sheetId: keyof typeof SHEET_SIZES): SheetPlan => {
  const sheet = SHEET_SIZES[sheetId];
  const result = planSheet(sheet, { widthMm: 35, heightMm: 45 }, { marginMm: sheet.marginMm });
  if (!result.ok) throw new Error('The fixture sheet must hold a photograph.');
  return result.plan;
};

describe('SheetPreview', () => {
  it('draws one slot per copy', () => {
    const plan = planFor('4x6in');
    const { container } = render(<SheetPreview plan={plan} />);

    expect(container.querySelectorAll('[data-slot]')).toHaveLength(plan.count);
  });

  it('says how many copies it is showing, for a reader who cannot see it', () => {
    render(<SheetPreview plan={planFor('4x6in')} />);

    expect(screen.getByRole('img', { name: '6 copies on one sheet' })).toBeInTheDocument();
  });

  it('shows the photograph where one is given', () => {
    const plan = planFor('4x6in');
    const { container } = render(<SheetPreview plan={plan} photoSrc={SAMPLE_PHOTO_LIGHT} />);

    expect(container.querySelectorAll('img')).toHaveLength(plan.count);
  });

  it('draws empty slots where none is', () => {
    const { container } = render(<SheetPreview plan={planFor('4x6in')} />);

    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('places each slot as a share of the sheet', () => {
    // Percentages rather than pixels, so the preview is the same drawing at
    // any size on the page.
    const plan = planFor('4x6in');
    const { container } = render(<SheetPreview plan={plan} />);
    const first = container.querySelector('[data-slot]');

    expect(first?.getAttribute('style')).toContain('%');
  });

  it('gives the preview the sheet’s own proportions', () => {
    const { container } = render(<SheetPreview plan={planFor('a4')} />);

    expect(container.firstElementChild?.getAttribute('style')).toContain('210 / 297');
  });

  it('turns the photograph where the sheet lays it on its side', () => {
    // A preview showing every photograph upright when half come out sideways
    // is a preview that surprises somebody at a counter.
    const result = planSheet(
      { widthMm: 100, heightMm: 60 },
      { widthMm: 30, heightMm: 50 },
      { marginMm: 0, gutterMm: 0 },
    );
    if (!result.ok) throw new Error('The fixture must place a photograph.');

    const { container } = render(
      <SheetPreview plan={result.plan} photoSrc={SAMPLE_PHOTO_LIGHT} />,
    );

    expect(container.querySelector('img')?.getAttribute('style')).toContain('rotate(90deg)');
  });

  it('leaves an upright photograph alone', () => {
    const { container } = render(
      <SheetPreview plan={planFor('4x6in')} photoSrc={SAMPLE_PHOTO_LIGHT} />,
    );

    expect(container.querySelector('img')?.getAttribute('style') ?? '').not.toContain('rotate');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SheetPreview plan={planFor('4x6in')} />);

    await expectNoAxeViolations(container);
  });
});

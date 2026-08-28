import { countryDocumentRoute } from '@/constants/routes.constants';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Prose } from './Prose';

const meta = {
  title: 'Content/Prose',
  component: Prose,
} satisfies Meta<typeof Prose>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Article: Story = {
  args: {
    children: (
      <>
        <h2>United States passport photo requirements</h2>
        <p>
          Your photo must be 2 by 2 inches, printed at 300 DPI or higher, with your head measuring
          between 1 and 1<sup>3</sup>/<sub>8</sub> inches from the bottom of your chin to the top of
          your head.
        </p>
        <h3>Background</h3>
        <p>
          The background must be plain white or off-white, with no shadows falling across it. A
          patterned wall will be rejected even if everything else is correct.
        </p>
        <ul>
          <li>No glasses, since November 2016</li>
          <li>Neutral expression, both eyes open</li>
          <li>Taken within the last six months</li>
        </ul>
        <p>
          {/* Built rather than written out, like every other internal link
              here: a route literal in a story drifts from the real route the
              moment one changes, and this one already had a trailing slash the
              site does not serve. */}
          See the <a href={countryDocumentRoute('us', 'passport')}>full checklist</a> for the
          complete list.
        </p>
      </>
    ),
  },
};

export const Unconstrained: Story = {
  args: {
    constrainMeasure: false,
    children: <p>Full-width content, used when a table or figure needs the whole column.</p>,
  },
};

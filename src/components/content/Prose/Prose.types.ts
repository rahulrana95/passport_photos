import type { ReactNode } from 'react';

export interface ProseProps {
  readonly children: ReactNode;
  /** Set false for content that should fill its container, such as a table. */
  readonly constrainMeasure?: boolean;
}

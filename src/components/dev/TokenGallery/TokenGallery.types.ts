import type { TokenGroup } from '@/theme/design-tokens.constants';

export interface TokenGalleryProps {
  /** Defaults to the full registry. Narrow it to document a single group. */
  readonly groups?: readonly TokenGroup[];
}

export interface TokenSwatchKind {
  readonly isColor: boolean;
}

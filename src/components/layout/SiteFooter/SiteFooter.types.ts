import type { NavLink } from '@/constants/navigation.constants';

export interface SiteFooterProps {
  /** Overrides the featured country list, mainly for stories and tests. */
  readonly featuredCountries?: readonly string[];
  /**
   * Overrides the legal links.
   *
   * Injected because there are none yet: the privacy page and the terms are
   * still to be built, and until they exist the footer must not link to them.
   * A prop keeps the column that will hold them rendering — and testable —
   * rather than deleted and rewritten later from memory.
   */
  readonly legalLinks?: readonly NavLink[];
}

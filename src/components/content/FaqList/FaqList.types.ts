export interface FaqEntry {
  readonly question: string;
  /** Plain text. Kept as a string so the same data can feed FAQPage JSON-LD. */
  readonly answer: string;
}

export interface FaqListProps {
  readonly heading: string;
  readonly entries: readonly FaqEntry[];
  /** Open the first entry by default, to show the pattern is expandable. */
  readonly openFirst?: boolean;
}

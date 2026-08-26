export interface RequirementRow {
  /** What the authority specifies, e.g. "Head height". */
  readonly label: string;
  /** The requirement itself, already formatted with units. */
  readonly value: string;
  /** Optional clarification shown beneath the value. */
  readonly note?: string;
}

export interface RequirementsTableProps {
  readonly caption: string;
  readonly rows: readonly RequirementRow[];
  /** Rendered beneath the table as the provenance line. */
  readonly sourceUrl?: string;
  readonly verifiedOn?: string;
}

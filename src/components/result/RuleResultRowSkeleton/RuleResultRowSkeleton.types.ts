export interface RuleResultRowSkeletonProps {
  /**
   * Whether to reserve the measurement line.
   *
   * Knowable in advance for the manual checklist and only for it: those rules
   * are questions for the reader — glasses, head covering — and never carry a
   * number, so a placeholder that reserved one would leave a blank line under
   * every item on the list. An automatic rule almost always carries one.
   */
  readonly withMeasurement?: boolean;
}

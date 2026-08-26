import type { RuleStatus } from '@/constants/rule-status.constants';

export interface RuleResultRowProps {
  /** What was checked, e.g. "Head height". */
  readonly label: string;
  readonly status: RuleStatus;
  /** What we measured, already formatted with units. */
  readonly measurement?: string;
  /** What the specification requires, already formatted with units. */
  readonly requirement?: string;
  /**
   * The physical action that would fix this, e.g. "Move about 30cm closer to
   * the camera." Required for any failing status: a verdict without an action
   * leaves the reader stuck.
   */
  readonly fixInstruction?: string;
}

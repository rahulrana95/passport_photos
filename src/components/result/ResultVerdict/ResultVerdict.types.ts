import type { RuleStatus } from '@/constants/rule-status.constants';

export interface ResultVerdictProps {
  readonly status: RuleStatus;
}

/*
 * There is deliberately no `announce` prop.
 *
 * The verdict is announced by the panel, once, through a hidden live region
 * carrying the whole sentence — "Check complete. This photo meets the
 * requirements." A live region here as well would say the verdict twice, and
 * would say only half of it: a screen-reader user needs to be told the WAIT
 * ended, which the headline on its own never says.
 */

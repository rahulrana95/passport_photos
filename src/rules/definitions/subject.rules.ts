import { fixAction } from '../fix-action.utils';
import { passed, ruleOutcome, unmeasured } from '../rule-outcome.utils';
import type { FaceRejectionReason } from '@/analysis/landmark-selection.utils';
import type { RuleMessageId } from '../rule-message.constants';
import type { RuleDefinition, RuleOutcome } from '../rule.types';

/**
 * Why the detector declined to measure any face, in words.
 *
 * This is the most important message in the report when it appears, because it
 * is the one that stops every other rule from meaning anything. A report that
 * quietly showed eighteen "we could not measure this" rows and no explanation
 * would leave the reader believing the tool is broken rather than that their
 * photograph is too small, too far to one side, or of two people.
 */
const REJECTION_MESSAGES: Readonly<Record<FaceRejectionReason, RuleMessageId>> = {
  'no-face': 'single-subject.no-face',
  'too-small': 'single-subject.too-small',
  'touches-frame-edge': 'single-subject.touches-frame-edge',
  'pose-unreliable': 'single-subject.pose-unreliable',
};

export const singleSubjectRule: RuleDefinition = {
  id: 'single-subject',
  requirements: [{ standard: 'iso-19794-5', id: 'presence-of-other-faces' }],
  severity: 'blocking',
  evidence: 'landmarks',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.detection === undefined) return unmeasured();
    if (!input.detection.ok) {
      return ruleOutcome('undetectable', REJECTION_MESSAGES[input.detection.reason]);
    }

    // Someone else in the frame is a failure even though we measured the right
    // face. Most authorities reject the photograph outright, and the largest
    // face being the subject is our assumption rather than an observation.
    return input.detection.hadOtherFaces
      ? ruleOutcome('fail', 'single-subject.multiple-faces', {
          fix: fixAction('photograph-alone'),
        })
      : passed();
  },
};

export const headCoveringVisibleRule: RuleDefinition = {
  id: 'head-covering-visible',
  requirements: [{ standard: 'iso-19794-5', id: 'hat-or-cap' }],
  // Advisory, and this is the rule the severity exists for. A flat-topped
  // silhouette is a hat or it is a particular head of hair, and a mask does
  // not settle which. Failing a photograph on it would reject people for their
  // hair; saying nothing would let a hat through the one measurement it most
  // affects. A warning is the honest width of what we know.
  severity: 'advisory',
  evidence: 'crown',
  fixGroup: undefined,
  evaluate: (input): RuleOutcome => {
    if (input.crown === undefined) return unmeasured();
    // A crown estimate that failed is the crown rule's business to report, and
    // it already does through the framing rules. Here it means only that there
    // is no silhouette to judge a covering from.
    if (!input.crown.ok) return unmeasured();

    return input.crown.mayIncludeCovering
      ? ruleOutcome('warning', 'head-covering-visible.may-include-covering', {
          fix: fixAction('remove-covering'),
        })
      : passed();
  },
};

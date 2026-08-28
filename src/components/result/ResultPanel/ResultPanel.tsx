import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import { reportShape } from '@/result/report-shape.utils';
import { resolveRuleMessage } from '@/rules/rule-message.utils';
import { verdictLabel } from '@/result/verdict-label.utils';
import { AnalysisProgress } from '../AnalysisProgress/AnalysisProgress';
import { ResultVerdict } from '../ResultVerdict/ResultVerdict';
import { ResultVerdictSkeleton } from '../ResultVerdictSkeleton/ResultVerdictSkeleton';
import { RuleResultRow } from '../RuleResultRow/RuleResultRow';
import { RuleResultRowSkeleton } from '../RuleResultRowSkeleton/RuleResultRowSkeleton';
import type { RuleResult } from '@/rules/rule.types';
import type { ResolvedPhotoSpec } from '@/photo-spec/photo-spec.types';
import type { ResultPanelProps } from './ResultPanel.types';
import styles from './ResultPanel.module.css';

/** Renders one rule's row from the shared resolver the PDF report also uses. */
const row = (
  result: RuleResult,
  spec: ResolvedPhotoSpec,
  content: ReturnType<typeof getContent>,
): React.JSX.Element => {
  // The same four strings the PDF puts in the same row. Formatting a
  // measurement twice, in two places, is how a report and a screen end up
  // disagreeing about the same photograph.
  const resolved = resolveRuleMessage(result, spec, content.rules);

  return (
    <RuleResultRow
      key={result.ruleId}
      label={resolved.label}
      status={result.status}
      {...(resolved.measurement === undefined ? {} : { measurement: resolved.measurement })}
      {...(resolved.requirement === undefined ? {} : { requirement: resolved.requirement })}
      {...(resolved.fixInstruction === undefined
        ? {}
        : { fixInstruction: resolved.fixInstruction })}
    />
  );
};

/** One placeholder per row the answer will have, each the height that row will be. */
const placeholders = (rows: readonly boolean[]): React.JSX.Element[] =>
  rows.map((withMeasurement, index) => (
    <RuleResultRowSkeleton key={index} withMeasurement={withMeasurement} />
  ));

/**
 * The panel's shape, which is the same in every state.
 *
 * Both the waiting and the finished view go through this, so a section cannot
 * exist in one and not the other — which was exactly the bug the measurement
 * caught: a skeleton that reserved the rule rows, forgot the verdict, the two
 * headings and the whole manual checklist, and let the page jump by a third of
 * its own height when the answer arrived.
 */
const layout = (
  content: ReturnType<typeof getContent>,
  parts: {
    readonly verdict: React.ReactNode;
    readonly ruleRows: React.ReactNode;
    readonly manualRows: React.ReactNode;
    readonly extra?: React.ReactNode;
  },
): React.JSX.Element => (
  <>
    {parts.verdict}
    {parts.extra}
    {/* h2, not h3. These are top-level sections of the page's content — the
        siblings of "What the United States requires" — and every other section
        heading on every page that mounts this is an h2. Starting at h3 made
        the heading order jump h1 to h3 on the checker page and on all forty
        country pages, which is a real defect for anyone navigating by heading
        and which the budget never saw while it only measured the homepage. */}
    {/* Beside the answer, not only in the footer.

        A reader who has just been told their photo meets the requirements is
        at the exact moment they might read that as "this will be accepted".
        The footer says otherwise three hundred pixels further down, which is
        not where the sentence does any work. Who actually decides belongs
        next to the verdict. */}
    <p className={styles['disclaimer']}>{content.legal.acceptanceDisclaimer}</p>
    <h2 className={styles['heading']}>{content.result.resultsHeading}</h2>
    <div className={styles['rows']}>{parts.ruleRows}</div>
    <div className={styles['checklist']}>
      <h2 className={styles['heading']}>{content.result.manualChecklistHeading}</h2>
      {parts.manualRows}
    </div>
  </>
);

/**
 * Everything the checks concluded, and everything they are still doing.
 *
 * The loading state is not a spinner. It is the same number of rows the answer
 * will have, in the same boxes, derived from the specification before any
 * analysis has run — so the page does not rearrange itself under somebody who
 * has started reading. That number is a real question asked of the real engine,
 * not an estimate: a specification that states an eye-line rule gets one more
 * row than one that does not, and a guess would be wrong about one of them.
 *
 * A cancelled analysis is deliberately NOT an error. It is the state the reader
 * asked for by choosing a different photograph, and an error box explaining
 * that they did what they meant to do is noise sitting where the next answer
 * should go.
 */
export const ResultPanel = ({
  state,
  spec,
  onRetry,
  children,
}: ResultPanelProps): React.JSX.Element => {
  const content = getContent();
  const shape = reportShape(spec);

  if (state.kind === 'failed' && state.error !== 'cancelled') {
    const failure = content.result.failures[state.error];

    return (
      <section className={styles['panel']}>
        <div className={styles['failure']} role="alert">
          <p className={styles['failureMessage']}>{failure.message}</p>
          <p className={styles['remedy']}>{failure.remedy}</p>
        </div>
        {onRetry === undefined ? null : (
          <button
            className={styles['retry']}
            type="button"
            data-track="result-retry"
            onClick={onRetry}
          >
            {content.result.retryLabel}
          </button>
        )}
      </section>
    );
  }

  if (state.kind === 'ready') {
    const { report } = state;

    return (
      <section className={styles['panel']}>
        {/*
          Announced once, and it says the wait ended as well as what the answer
          is. The headline below carries the same verdict visually; a live
          region on that too would say it twice, and would say only half of it.
        */}
        <p className={styles['announcement']} role="status" aria-live="polite">
          {interpolate(content.result.completeAnnouncement, {
            verdict: verdictLabel(report.overall, content),
          })}
        </p>
        <div className={styles['progressSlot']} />
        {layout(content, {
          verdict: <ResultVerdict status={report.overall} />,
          extra: children,
          ruleRows: report.results.map((result) => row(result, report.spec, content)),
          manualRows: report.manualChecklist.map((result) => row(result, report.spec, content)),
        })}
      </section>
    );
  }

  return (
    <section className={styles['panel']} aria-busy={state.kind === 'analysing'}>
      {/*
        The progress bar's space is held in every state, including the finished
        one. Letting it appear and vanish would move everything below it twice
        — once when the checks start and once when they end.
      */}
      <div className={styles['progressSlot']}>
        {state.kind === 'analysing' ? (
          <AnalysisProgress stage={state.stage} stageRatio={state.stageRatio} />
        ) : null}
      </div>
      {layout(content, {
        verdict: <ResultVerdictSkeleton />,
        ruleRows: placeholders(shape.ruleRows),
        manualRows: placeholders(shape.manualRows),
      })}
    </section>
  );
};

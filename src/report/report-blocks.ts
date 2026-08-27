import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import { resolveRuleMessage } from '@/rules/rule-message.utils';
import { ruleStatusLabel } from '@/rules/rule-status-label.utils';
import {
  BLOCK_GAP_PT,
  BODY_SIZE_PT,
  DETAIL_INDENT_PT,
  HEADING_SIZE_PT,
  LINE_GAP_PT,
  PHOTO_MAX_HEIGHT_PT,
  PHOTO_MAX_WIDTH_PT,
  SECTION_GAP_PT,
  SMALL_SIZE_PT,
  TITLE_SIZE_PT,
} from './pdf-text.constants';
import { TEXT_WIDTH_PT } from './paginate.utils';
import { wrapText } from './text-metrics.utils';
import type { ComplianceReport, RuleResult } from '@/rules/rule.types';
import type { ContentTree } from '@/content/content.types';
import type { PdfImageResource } from '@/pdf/pdf-document.types';
import type { ReportBlock, ReportLine } from './report-block.types';

export interface ReportSubject {
  readonly report: ComplianceReport;
  /** The annotated photograph, if one was produced. */
  readonly photo: PdfImageResource | undefined;
  readonly now: Date;
  readonly locale: string;
}

const line = (
  text: string,
  sizePt: number,
  font: ReportLine['font'],
  indentPt = 0,
): ReportLine => ({ text, sizePt, font, indentPt });

const wrapped = (
  text: string,
  sizePt: number,
  font: ReportLine['font'],
  indentPt = 0,
): readonly ReportLine[] =>
  wrapText(text, sizePt, TEXT_WIDTH_PT - indentPt).map((part) =>
    line(part, sizePt, font, indentPt),
  );

const heading = (text: string): ReportBlock => ({
  kind: 'text',
  lines: [line(text, HEADING_SIZE_PT, 'Helvetica-Bold')],
  spaceAfterPt: BLOCK_GAP_PT,
});

/**
 * Fits the annotated photograph into the space the first page can spare.
 *
 * Scaled as a whole. A report that stretched somebody's photograph to fill a
 * box would be showing them a picture of a differently shaped person directly
 * above a paragraph about their head being the wrong size.
 */
const photoBlock = (photo: PdfImageResource): ReportBlock => {
  const scale = Math.min(
    PHOTO_MAX_WIDTH_PT / photo.widthPx,
    PHOTO_MAX_HEIGHT_PT / photo.heightPx,
  );

  return {
    kind: 'image',
    image: 0,
    widthPt: photo.widthPx * scale,
    heightPt: photo.heightPx * scale,
    spaceAfterPt: SECTION_GAP_PT,
  };
};

/**
 * One rule, as a block that cannot be split across a page.
 *
 * The order is fixed: what was checked, what we found, what it was measured
 * against, and what to do. A reader who stops after the first line has the
 * finding; one who reads to the end has the remedy. Reversing any of it
 * produces a report that answers a question before asking it.
 */
const resultBlock = (
  result: RuleResult,
  subject: ReportSubject,
  content: ContentTree,
): ReportBlock => {
  const resolved = resolveRuleMessage(result, subject.report.spec, content.rules, subject.locale);
  const lines: ReportLine[] = [
    line(`${resolved.label}: ${ruleStatusLabel(result.status, content)}`, BODY_SIZE_PT, 'Helvetica-Bold'),
    ...wrapped(resolved.message, SMALL_SIZE_PT, 'Helvetica', DETAIL_INDENT_PT),
  ];

  // The measurement and the requirement are separate lines, and separately
  // conditional. Combining them into one line would need a case for a
  // measurement with no requirement beside it, which no rule produces — a
  // branch nothing can take is worse than two plain ones.
  if (resolved.measurement !== undefined) {
    lines.push(line(resolved.measurement, SMALL_SIZE_PT, 'Helvetica', DETAIL_INDENT_PT));
  }

  if (resolved.requirement !== undefined) {
    lines.push(
      line(
        `${content.report.requirementLabel}: ${resolved.requirement}`,
        SMALL_SIZE_PT,
        'Helvetica',
        DETAIL_INDENT_PT,
      ),
    );
  }

  if (resolved.fixInstruction !== undefined) {
    lines.push(...wrapped(resolved.fixInstruction, SMALL_SIZE_PT, 'Helvetica', DETAIL_INDENT_PT));
  }

  return { kind: 'text', lines, spaceAfterPt: BLOCK_GAP_PT };
};

/**
 * The whole report, as blocks, in the order it reads.
 *
 * The disclaimer is last and it is verbatim. It says who actually decides, and
 * paraphrasing it here — or worse, softening it — would turn the one honest
 * sentence in the document into marketing.
 */
export const buildReportBlocks = (subject: ReportSubject): readonly ReportBlock[] => {
  const content = getContent(subject.locale);
  const { report } = subject;
  const date = new Intl.DateTimeFormat(subject.locale, { dateStyle: 'long' }).format(subject.now);
  const coverage = report.coverage;

  return [
    {
      kind: 'text',
      lines: [
        line(content.report.title, TITLE_SIZE_PT, 'Helvetica-Bold'),
        line(interpolate(content.report.checkedOn, { date }), SMALL_SIZE_PT, 'Helvetica'),
      ],
      spaceAfterPt: SECTION_GAP_PT,
    },
    ...(subject.photo === undefined ? [] : [photoBlock(subject.photo)]),

    heading(content.report.overallHeading),
    {
      kind: 'text',
      lines: [line(ruleStatusLabel(report.overall, content), BODY_SIZE_PT, 'Helvetica-Bold')],
      spaceAfterPt: SECTION_GAP_PT,
    },

    heading(content.report.resultsHeading),
    ...report.results.map((result) => resultBlock(result, subject, content)),

    heading(content.report.checklistHeading),
    ...report.manualChecklist.map((result) => resultBlock(result, subject, content)),

    heading(content.report.coverageHeading),
    {
      kind: 'text',
      lines: [
        ...wrapped(
          interpolate(content.report.coverageSummary, {
            total: String(coverage.totalCount),
            checked: String(coverage.checkedCount),
            manual: String(coverage.manualCount),
            undetectable: String(coverage.undetectableCount),
            planned: String(coverage.plannedCount),
          }),
          SMALL_SIZE_PT,
          'Helvetica',
        ),
      ],
      spaceAfterPt: SECTION_GAP_PT,
    },

    heading(content.report.sourceHeading),
    {
      kind: 'text',
      lines: [
        line(report.spec.source, SMALL_SIZE_PT, 'Helvetica'),
        line(
          interpolate(content.report.sourceVerified, { date: report.spec.lastVerified }),
          SMALL_SIZE_PT,
          'Helvetica',
        ),
      ],
      spaceAfterPt: SECTION_GAP_PT,
    },

    {
      kind: 'text',
      lines: [...wrapped(content.legal.acceptanceDisclaimer, SMALL_SIZE_PT, 'Helvetica')],
      spaceAfterPt: LINE_GAP_PT,
    },
  ];
};

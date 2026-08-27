import { z } from 'zod';
import { CROWN_DEFINITIONS } from '@/analysis/crown-detection.utils';
import { COUNTRY_SLUGS } from '@/constants/country.constants';
import { DOCUMENT_TYPES } from '@/constants/document-type.constants';
import {
  AI_EDITING_POLICIES,
  VERIFICATION_STATUSES,
  BACKGROUND_COLOURS,
  EXPRESSION_POLICIES,
  GLASSES_POLICIES,
  HEAD_COVERING_POLICIES,
} from './photo-spec.constants';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  error: 'Must be an ISO date, YYYY-MM-DD',
});

const hexColour = z.string().regex(/^#[0-9a-f]{6}$/, {
  error: 'Must be a lowercase six-digit hex colour',
});

export const printSizeSchema = z
  .object({
    widthMm: z.number().positive(),
    heightMm: z.number().positive(),
    dpi: z.number().int().positive(),
  })
  .describe('Physical size the photo is printed at');

export const digitalRequirementSchema = z
  .object({
    minEdgePx: z.number().int().positive(),
    maxEdgePx: z.number().int().positive().optional(),
    maxBytes: z.number().int().positive().optional(),
    format: z.enum(['jpeg', 'png']),
  })
  .refine((value) => value.maxEdgePx === undefined || value.maxEdgePx >= value.minEdgePx, {
    error: 'maxEdgePx must not be smaller than minEdgePx',
  });

/**
 * Head height is authored in whichever unit the issuing authority publishes.
 *
 * The US states millimetres; the Schengen standard states a proportion of the
 * photo. Converting at authoring time would bake in a rounding error and hide
 * what the authority actually said, so the authored unit is preserved and both
 * forms are derived once, at the registry boundary.
 */
export const headHeightSchema = z.discriminatedUnion('unit', [
  z
    .object({ unit: z.literal('mm'), minMm: z.number().positive(), maxMm: z.number().positive() })
    .refine((v) => v.maxMm > v.minMm, { error: 'maxMm must be greater than minMm' }),
  z
    .object({
      unit: z.literal('ratio'),
      minRatio: z.number().positive().max(1),
      maxRatio: z.number().positive().max(1),
    })
    .refine((v) => v.maxRatio > v.minRatio, { error: 'maxRatio must be greater than minRatio' }),
]);

export const eyeLineSchema = z
  .object({
    minFromBottomMm: z.number().positive(),
    maxFromBottomMm: z.number().positive(),
  })
  .refine((v) => v.maxFromBottomMm > v.minFromBottomMm, {
    error: 'maxFromBottomMm must be greater than minFromBottomMm',
  });

export const backgroundSchema = z.object({
  colour: z.enum(BACKGROUND_COLOURS),
  /**
   * The acceptable colours, as one or more inclusive ranges.
   *
   * A LIST, because an authority can accept two colours that are nowhere near
   * each other. HM Passport Office accepts "plain cream or light grey": one is
   * warm, one is neutral, and a single range wide enough to hold both also
   * holds every tint between them — a mint-green wall would pass. Two ranges
   * accept exactly the two colours published and nothing in the gap.
   */
  hexRanges: z.array(z.tuple([hexColour, hexColour])).min(1, {
    error: 'A background must state at least one acceptable colour range',
  }),
  /** Permitted standard deviation of background luminance, 0–255. */
  uniformityTolerance: z.number().positive(),
});

export const photoSpecSchema = z.object({
  country: z.enum(COUNTRY_SLUGS),
  document: z.enum(DOCUMENT_TYPES),

  print: printSizeSchema,
  /** Additional sizes the authority also accepts, e.g. a legacy format. */
  alternativePrintSizes: z.array(printSizeSchema).optional(),
  digital: digitalRequirementSchema,

  headHeight: headHeightSchema,
  eyeLine: eyeLineSchema.optional(),
  background: backgroundSchema,

  /**
   * Where the top of the head is, for this authority.
   *
   * Not a detector setting — a published difference. The United States measures
   * "the top of the head, including the hair"; the United Kingdom and the
   * Schengen states measure from the crown, meaning the skull. On anyone with
   * volume those are several millimetres apart, which is most of the tolerance
   * on a head-height rule, so a single hard-coded answer is wrong for one
   * country or the other.
   */
  crownDefinition: z.enum(CROWN_DEFINITIONS),

  glasses: z.enum(GLASSES_POLICIES),
  headCovering: z.enum(HEAD_COVERING_POLICIES),
  expression: z.enum(EXPRESSION_POLICIES),
  aiEditingPolicy: z.enum(AI_EDITING_POLICIES),
  maxAgeMonths: z.number().int().positive(),

  /**
   * Provenance is required, not optional. A specification without a source is a
   * specification nobody checked, and this registry's only real asset is being
   * trustworthy about exactly that.
   */
  source: z.url({ error: 'Every spec must cite the issuing authority page it came from' }),
  lastVerified: isoDate,
  verification: z.enum(VERIFICATION_STATUSES),
  notes: z.array(z.string()).optional(),
});

export type PhotoSpec = z.infer<typeof photoSpecSchema>;
export type PrintSize = z.infer<typeof printSizeSchema>;
export type Background = z.infer<typeof backgroundSchema>;

import { roundMeasurement } from '@/utils/format-measurement.utils';
import {
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_SECOND,
  RATIO_PRECISION_DIGITS,
  SECONDS_PER_MINUTE,
  SPEC_REVERIFICATION_DAYS,
} from './photo-spec.constants';
import type { PhotoSpec } from './photo-spec.schemas';
import type { ResolvedHeadHeight, ResolvedPhotoSpec } from './photo-spec.types';

const DAYS_TO_MS = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

/**
 * Converts head height into both units, once, at the registry boundary.
 *
 * The ratio is against the printed photo height, which is what "face must fill
 * 70-80% of the photo" means in the Schengen standard.
 */
export const resolveHeadHeight = (
  headHeight: PhotoSpec['headHeight'],
  printHeightMm: number,
): ResolvedHeadHeight =>
  headHeight.unit === 'mm'
    ? {
        minMm: headHeight.minMm,
        maxMm: headHeight.maxMm,
        minRatio: roundMeasurement(headHeight.minMm / printHeightMm, RATIO_PRECISION_DIGITS),
        maxRatio: roundMeasurement(headHeight.maxMm / printHeightMm, RATIO_PRECISION_DIGITS),
        authoredUnit: 'mm',
      }
    : {
        minMm: roundMeasurement(headHeight.minRatio * printHeightMm),
        maxMm: roundMeasurement(headHeight.maxRatio * printHeightMm),
        minRatio: headHeight.minRatio,
        maxRatio: headHeight.maxRatio,
        authoredUnit: 'ratio',
      };

/**
 * `now` is injected rather than read from the clock, so a test cannot become
 * flaky by crossing the staleness boundary on a particular day.
 */
export const isSpecStale = (lastVerified: string, now: Date): boolean => {
  const verifiedAt = new Date(`${lastVerified}T00:00:00Z`).getTime();
  const ageDays = (now.getTime() - verifiedAt) / DAYS_TO_MS;
  return ageDays > SPEC_REVERIFICATION_DAYS;
};

export const resolveSpec = (spec: PhotoSpec, now: Date): ResolvedPhotoSpec => ({
  ...spec,
  headHeight: resolveHeadHeight(spec.headHeight, spec.print.heightMm),
  isStale: isSpecStale(spec.lastVerified, now),
});

/**
 * Deep-merges a member-state override onto the Schengen base.
 *
 * Deliberately not a spread: a shallow merge would replace the whole `print` or
 * `background` object when a state overrides one field of it, silently dropping
 * every sibling key. That failure is invisible — the spec still parses, it is
 * just wrong.
 */
export const mergeSpecOverride = (
  base: PhotoSpec,
  override: DeepPartial<PhotoSpec>,
): PhotoSpec => {
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;

    const existing = merged[key];
    const bothPlainObjects =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof existing === 'object' &&
      existing !== null &&
      !Array.isArray(existing);

    merged[key] = bothPlainObjects
      ? { ...(existing as object), ...(value as object) }
      : value;
  }

  return merged as PhotoSpec;
};

export type DeepPartial<T> = {
  [K in keyof T]?: (T[K] extends object ? DeepPartial<T[K]> : T[K]) | undefined;
};

/** Frozen in development so an accidental mutation surfaces immediately. */
export const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;

  for (const key of Object.getOwnPropertyNames(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};

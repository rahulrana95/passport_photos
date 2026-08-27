import { getContent } from '@/content/content.registry';
import { interpolate } from '@/content/interpolate.utils';
import type { IngestionMessage } from '@/content/content.types';
import type { IngestionFailure } from './ingestion-failure.types';

/**
 * Turns a refusal into the two sentences the reader sees.
 *
 * The split between this and ingestionFailures is the whole point: that module
 * decides WHICH refusal applies and what the numbers are, this one supplies the
 * words. Neither knows the other's job, and a second language changes only the
 * content file.
 */
export const resolveIngestionFailure = (
  failure: IngestionFailure,
  locale?: string,
): IngestionMessage => {
  const copy = getContent(locale).upload.failures[failure.messageId];

  return {
    message: interpolate(copy.message, failure.params),
    remedy: interpolate(copy.remedy, failure.params),
  };
};

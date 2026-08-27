import { describe, expect, it } from 'vitest';
import { getContent } from '@/content/content.registry';
import { INGESTION_MESSAGE_IDS } from './ingestion-failure.types';
import { ingestionFailures } from './ingestion-failure.utils';
import { resolveIngestionFailure } from './resolve-failure.utils';
import type { IngestionFailure } from './ingestion-failure.types';

const UNRESOLVED_PLACEHOLDER = /\{\w+\}/;

/** One failure per message id, built the way production builds it. */
const EVERY_FAILURE: readonly IngestionFailure[] = [
  ingestionFailures.emptyFile(),
  ingestionFailures.tooLarge(60 * 1024 * 1024),
  ingestionFailures.unrecognisedFormat(),
  ingestionFailures.formatNotSupported('tiff'),
  ingestionFailures.heicNotDecodable(),
  ingestionFailures.decodeFailed('jpeg'),
  ingestionFailures.tooSmall(320, 240),
  ingestionFailures.tooLargeDimensions(20_000, 18_000),
  ingestionFailures.animatedSource('gif'),
];

describe('resolveIngestionFailure', () => {
  it('covers every message id the type allows', () => {
    // The guard against a factory being added without its copy. Adding an id
    // and forgetting the sentence is the failure mode that ships a blank
    // refusal on the first screen a reader ever sees.
    expect(EVERY_FAILURE.map((failure) => failure.messageId).sort()).toEqual(
      [...INGESTION_MESSAGE_IDS].sort(),
    );
  });

  it.each(EVERY_FAILURE)('leaves no placeholder standing in $messageId', (failure) => {
    const resolved = resolveIngestionFailure(failure);

    expect(resolved.message).not.toMatch(UNRESOLVED_PLACEHOLDER);
    expect(resolved.remedy).not.toMatch(UNRESOLVED_PLACEHOLDER);
  });

  it.each(EVERY_FAILURE)('says something in both sentences for $messageId', (failure) => {
    const resolved = resolveIngestionFailure(failure);

    // A remedy is the whole reason this product does not say "please try
    // another file", so an empty one is a regression rather than a gap.
    expect(resolved.message.length).toBeGreaterThan(0);
    expect(resolved.remedy.length).toBeGreaterThan(0);
  });

  it('interpolates the measured numbers into the sentence', () => {
    const resolved = resolveIngestionFailure(ingestionFailures.tooSmall(320, 240));

    expect(resolved.message).toContain('320');
    expect(resolved.message).toContain('240');
  });

  it('interpolates the limit into the remedy, not only the message', () => {
    const resolved = resolveIngestionFailure(ingestionFailures.tooSmall(320, 240));

    expect(resolved.remedy).toContain('480');
  });

  it('explains a HEIC differently from a TIFF, though both carry the same code', () => {
    const heic = resolveIngestionFailure(ingestionFailures.heicNotDecodable());
    const tiff = resolveIngestionFailure(ingestionFailures.formatNotSupported('tiff'));

    // This split is the entire reason messageId exists alongside code: one of
    // these is three taps in Photos away from working and the other is not.
    expect(heic.remedy).not.toBe(tiff.remedy);
  });

  it('takes the copy from the requested locale', () => {
    const resolved = resolveIngestionFailure(ingestionFailures.emptyFile(), 'en');

    expect(resolved.message).toBe(getContent('en').upload.failures['empty-file'].message);
  });
});

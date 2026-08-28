import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE } from '@/constants/site.constants';
import { formatFileSize } from './file-size.utils';

describe('a published file-size ceiling', () => {
  it('writes 240,000 bytes as the 240 kB the authority publishes', () => {
    // The DS-160's own page says 240 KB. A binary divisor prints 234, which
    // reads as our being wrong on the number people check most carefully.
    expect(formatFileSize(240_000, DEFAULT_LOCALE)).toBe('240 kB');
  });

  it('writes ten million bytes as 10 MB, not as ten thousand kilobytes', () => {
    expect(formatFileSize(10_000_000, DEFAULT_LOCALE)).toBe('10 MB');
  });

  it('changes unit exactly at a megabyte', () => {
    expect(formatFileSize(999_999, DEFAULT_LOCALE)).toContain('kB');
    expect(formatFileSize(1_000_000, DEFAULT_LOCALE)).toContain('MB');
  });
});

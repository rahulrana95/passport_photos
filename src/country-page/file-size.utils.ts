import { formatMeasurement } from '@/measurement/format-measurement.utils';
import { BYTES_PER_KB, BYTES_PER_MB } from './country-page.constants';

/**
 * A file-size ceiling, written the way the authority wrote it.
 *
 * DECIMAL, NOT BINARY. Every authority that publishes a limit publishes it in
 * decimal: the DS-160's "240 KB" is 240,000 bytes, and dividing by 1024 would
 * print 234 kB beside an official page saying 240 — which reads as our being
 * wrong, on the one number the reader is comparing most carefully.
 *
 * Megabytes above a megabyte, because "10 MB" is the sentence and "10,000 kB"
 * is a number nobody checks their file against.
 */
export const formatFileSize = (bytes: number, locale: string): string =>
  bytes >= BYTES_PER_MB
    ? formatMeasurement(bytes / BYTES_PER_MB, 'megabyte', locale)
    : formatMeasurement(bytes / BYTES_PER_KB, 'kilobyte', locale);

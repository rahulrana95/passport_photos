import { FORMAT_SNIFF_BYTES } from '@/ingestion/image-format.constants';

/**
 * Reads only the leading bytes of a file, never the whole thing.
 *
 * A phone photograph is tens of megabytes and the format check needs thirty-two
 * bytes of it. Reading the file into memory to look at its first line would
 * stall the tab on exactly the devices least able to afford it, and would do
 * it before we have established the file is an image at all.
 */
export const readFileHeader = async (file: Blob): Promise<Uint8Array> =>
  new Uint8Array(await file.slice(0, FORMAT_SNIFF_BYTES).arrayBuffer());

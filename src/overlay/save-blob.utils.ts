/**
 * Hands a generated file to the reader.
 *
 * An object URL and a synthetic click, revoked immediately afterwards. The
 * revoke is not housekeeping: an object URL pins the whole blob in memory for
 * the lifetime of the document, and this blob is a full-resolution photograph.
 * A reader who exports a few times would be holding several originals in memory
 * on a phone.
 *
 * Safe to revoke straight after the click — the browser has already taken its
 * own reference to the blob by then.
 */
export const saveBlob = (blob: Blob, filename: string, target: Document): void => {
  const url = URL.createObjectURL(blob);
  const link = target.createElement('a');

  link.href = url;
  link.download = filename;
  target.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

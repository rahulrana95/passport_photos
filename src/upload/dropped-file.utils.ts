export type DroppedSelection =
  | { readonly kind: 'file'; readonly file: File; readonly ignored: number }
  | { readonly kind: 'none' };

/**
 * Picks the photograph out of whatever was dropped.
 *
 * PEOPLE DROP THE WRONG THINGS, constantly, and every one of them arrives
 * here as the same event. A whole album selected by accident; the folder the
 * photograph is in rather than the photograph; a link dragged out of a browser
 * tab; a file that is genuinely empty because the transfer never finished.
 *
 * Taking the first file and saying so beats refusing a drop of four
 * photographs — the reader meant one of them and would only drop it again.
 *
 * A folder is recognised by the only thing that distinguishes it here: it has
 * no type and no size. So does a genuinely empty file, and that ambiguity is
 * unavoidable from this side of the API — the browser hands over the same
 * shape for both. The tie is broken toward "not a file", because the advice
 * for a folder is useful to somebody with an empty file and the advice for an
 * empty file is baffling to somebody who dropped a folder.
 */
const looksLikeFolder = (file: File): boolean => file.type === '' && file.size === 0;

export const selectDroppedFile = (files: readonly File[]): DroppedSelection => {
  const usable = files.filter((file) => !looksLikeFolder(file));
  const [first] = usable;

  return first === undefined
    ? { kind: 'none' }
    : { kind: 'file', file: first, ignored: usable.length - 1 };
};

/** Everything a drop or a paste carries, as a plain array. */
export const filesFrom = (list: FileList | null | undefined): readonly File[] =>
  list === null || list === undefined ? [] : [...list];

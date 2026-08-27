/**
 * A FileList, which jsdom does not let a test construct.
 *
 * The only way to make one in a browser is to have the user drop or choose
 * files, and jsdom implements neither DataTransfer nor the picker. So the drop
 * and paste paths — the two most breakable in the upload zone, and the two a
 * unit test is most needed for — would otherwise be untestable outside a real
 * browser.
 *
 * Faithful in every way the product uses: indexed access, `length`, `item`,
 * and iteration, which is what `[...list]` needs. It is a plain object rather
 * than a subclass because FileList has no constructible form to subclass.
 */
export const fileListOf = (...files: readonly File[]): FileList => {
  const list: Record<number, File> = {};
  files.forEach((file, index) => {
    list[index] = file;
  });

  return {
    ...list,
    length: files.length,
    item: (index: number): File | null => files[index] ?? null,
    [Symbol.iterator]: (): ArrayIterator<File> => files[Symbol.iterator](),
  } as unknown as FileList;
};

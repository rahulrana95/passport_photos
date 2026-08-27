import { describe, expect, it } from 'vitest';
import { fileListOf } from '@/testing/file-list.stub';
import { filesFrom, selectDroppedFile } from './dropped-file.utils';

const photo = (name: string, size = 1_024): File => {
  const file = new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
  return file;
};

/**
 * A folder, as the browser hands one over: no type, no size. There is no other
 * signal available from a DataTransfer's file list, which is exactly why the
 * production heuristic is written the way it is.
 */
const folderLike = (name: string): File => new File([], name, { type: '' });

describe('selectDroppedFile', () => {
  it('takes the only file', () => {
    const file = photo('passport.jpg');

    expect(selectDroppedFile([file])).toEqual({ kind: 'file', file, ignored: 0 });
  });

  it('takes the first of several and reports how many it passed over', () => {
    const first = photo('one.jpg');

    // Refusing a four-photograph drop would only make the reader drop one of
    // them again, so the count exists to say what happened, not to refuse.
    expect(selectDroppedFile([first, photo('two.jpg'), photo('three.jpg')])).toEqual({
      kind: 'file',
      file: first,
      ignored: 2,
    });
  });

  it('reports nothing usable for an empty drop', () => {
    expect(selectDroppedFile([])).toEqual({ kind: 'none' });
  });

  it('reports nothing usable when only a folder was dropped', () => {
    expect(selectDroppedFile([folderLike('Camera Roll')])).toEqual({ kind: 'none' });
  });

  it('skips a folder dropped alongside a photograph', () => {
    const file = photo('passport.jpg');

    // The folder must not count toward `ignored` either: telling somebody we
    // used the first of two files when they dropped one file is a lie.
    expect(selectDroppedFile([folderLike('Camera Roll'), file])).toEqual({
      kind: 'file',
      file,
      ignored: 0,
    });
  });

  it('keeps a zero-byte file that declares a type, so the empty-file refusal can explain itself', () => {
    // A truncated download has a type and no bytes. Treating it as a folder
    // here would replace a precise refusal with a baffling one.
    const truncated = new File([], 'passport.jpg', { type: 'image/jpeg' });

    expect(selectDroppedFile([truncated])).toEqual({
      kind: 'file',
      file: truncated,
      ignored: 0,
    });
  });
});

describe('filesFrom', () => {
  it('returns an array for a real file list', () => {
    const list = fileListOf(photo('passport.jpg'));

    expect(filesFrom(list).map((file) => file.name)).toEqual(['passport.jpg']);
  });

  it('returns nothing for null, which is what a paste of text carries', () => {
    expect(filesFrom(null)).toEqual([]);
  });

  it('returns nothing for undefined, which is what a clipboard without files carries', () => {
    expect(filesFrom(undefined)).toEqual([]);
  });
});

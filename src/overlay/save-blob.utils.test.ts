import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBlob } from './save-blob.utils';

const withObjectUrl = (): { created: string[]; revoked: string[] } => {
  const created: string[] = [];
  const revoked: string[] = [];

  URL.createObjectURL = vi.fn(() => {
    const url = `blob:test/${created.length}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => void revoked.push(url));

  return { created, revoked };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('handing a file to the reader', () => {
  it('clicks a download link and takes it away again', () => {
    withObjectUrl();
    const clicks: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement): void {
      clicks.push(this.download);
    };

    saveBlob(new Blob(['x']), 'photo-with-measurements.png', document);

    expect(clicks).toEqual(['photo-with-measurements.png']);
    expect(document.querySelectorAll('a')).toHaveLength(0);
    HTMLAnchorElement.prototype.click = original;
  });

  it('releases the object URL immediately', () => {
    // An object URL pins the whole blob in memory for the lifetime of the
    // document, and this blob is a full-resolution photograph. A reader who
    // exports three times would be holding three originals on a phone.
    const urls = withObjectUrl();
    HTMLAnchorElement.prototype.click = vi.fn();

    saveBlob(new Blob(['x']), 'photo.png', document);

    expect(urls.revoked).toEqual(urls.created);
  });
});

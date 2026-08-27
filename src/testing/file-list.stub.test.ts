import { describe, expect, it } from 'vitest';
import { fileListOf } from './file-list.stub';

const photo = (name: string): File => new File([new Uint8Array(1)], name, { type: 'image/jpeg' });

/**
 * A stub that lies about the shape it is standing in for would send every test
 * that depends on it green while the production code it exercises is broken,
 * so the stub is held to the parts of the FileList contract the product uses.
 */
describe('fileListOf', () => {
  it('reports its length', () => {
    expect(fileListOf(photo('a.jpg'), photo('b.jpg'))).toHaveLength(2);
  });

  it('supports indexed access', () => {
    const list = fileListOf(photo('a.jpg'));

    expect(list[0]?.name).toBe('a.jpg');
  });

  it('supports item()', () => {
    const list = fileListOf(photo('a.jpg'));

    expect(list.item(0)?.name).toBe('a.jpg');
  });

  it('returns null from item() past the end, as the real interface does', () => {
    expect(fileListOf().item(0)).toBeNull();
  });

  it('spreads into an array, which is how the product reads it', () => {
    const list = fileListOf(photo('a.jpg'), photo('b.jpg'));

    expect([...list].map((file) => file.name)).toEqual(['a.jpg', 'b.jpg']);
  });

  it('is empty when given nothing', () => {
    expect([...fileListOf()]).toEqual([]);
  });
});

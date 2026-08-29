/**
 * Where the preview's object URL comes from, and where it goes to die.
 *
 * A port rather than a direct call to URL.createObjectURL for the usual two
 * reasons, and here they are both real. jsdom implements neither method, so
 * without a seam the entire preview path — the branch that actually shows a
 * reader their own photograph — would be reachable only in a browser. And an
 * object URL is a leak with a long fuse: it pins the whole decoded photograph
 * in memory until it is revoked, so a test that can watch revoke() being called
 * is the only way to prove the leak is closed.
 */
export interface ObjectUrlPort {
  readonly create: (blob: Blob) => string;
  readonly revoke: (url: string) => void;
}

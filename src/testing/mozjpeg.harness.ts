import { readFileSync } from 'node:fs';
import { createMozjpegEncoder } from '@/encode/mozjpeg-encoder';
import type { JpegEncoder } from '@/encode/jpeg-encoder.types';
import type { MozjpegEncode } from '@/encode/mozjpeg-encoder';

/**
 * The real mozjpeg, running inside the unit suite.
 *
 * Almost everything about encoding is tested against a deterministic fake, and
 * that is right: the search, the metadata rewriting and the ordering are logic
 * around the encoder rather than inside it, and a real compressor makes those
 * tests slow and their failures ambiguous.
 *
 * Two claims cannot be made against a fake, though, and they are the two the
 * reader is most exposed to: that a file this product produces is under the
 * authority's byte ceiling, and that it declares the right print resolution. A
 * fake can be made to agree with any belief we hold about mozjpeg's output.
 * So one integration test runs the actual encoder — and this is what lets it.
 *
 * The module normally fetches its own WebAssembly over the network, which
 * neither jsdom nor a hermetic test run should be doing. Compiling the file
 * off disk and handing the module the result is the officially supported way
 * in, and it keeps the test offline.
 */
const MOZJPEG_WASM_PATH = 'node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm';

interface MozjpegModule {
  readonly init: (module: WebAssembly.Module) => Promise<void>;
  readonly default: MozjpegEncode;
}

export const createRealMozjpegEncoder = async (): Promise<JpegEncoder> => {
  const compiled = await WebAssembly.compile(readFileSync(MOZJPEG_WASM_PATH));
  const mozjpeg = (await import('@jsquash/jpeg/encode')) as unknown as MozjpegModule;

  await mozjpeg.init(compiled);

  return createMozjpegEncoder(mozjpeg.default);
};

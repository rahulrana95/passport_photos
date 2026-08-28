/**
 * libheif ships no types for its browser bundle, only for the raw embind
 * surface, and that surface is not what this code calls.
 *
 * Declared as the factory it actually is rather than as `any`: the module's
 * default export is an Emscripten module factory returning a promise, and the
 * loader is the single place that turns it into our own narrow interface.
 */
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  const factory: () => Promise<unknown>;
  export default factory;
}

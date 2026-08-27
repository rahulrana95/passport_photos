/**
 * Substitutes `{name}` placeholders in a copy template.
 *
 * Deliberately the smallest thing that works. A message-format library brings
 * plurals, genders and select expressions, all of which are real problems in
 * some language and none of which any string in this product has yet — and it
 * brings them at a page-weight cost on a site whose whole argument is that it
 * loads and runs on the reader's own device.
 *
 * A placeholder with no value is left standing rather than blanked. An empty
 * gap in a sentence reads as a rendering glitch and is invisible in review;
 * "{amount}" on screen is unmistakable, and a test asserts none survives.
 */
export const interpolate = (
  template: string,
  values: Readonly<Record<string, string>>,
): string =>
  template.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);

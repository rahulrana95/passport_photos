/**
 * Every property key this product may ever send, as a set.
 *
 * The second half of the guard. The event union decides what CAN be built; this
 * decides what is allowed OUT, and the payload builder refuses anything not
 * named here. Two independent things would have to be edited to leak a
 * measurement, and the test suite asserts the two agree.
 *
 * Read the list as a promise: a country, a document, a rule's name, a verdict,
 * a count, a file format, a refusal reason. Nothing measured from a face.
 */
export const ALLOWED_PROPERTY_KEYS: readonly string[] = [
  'country',
  'document',
  'format',
  'reason',
  'overall',
  'failedRules',
  'ruleId',
];

/**
 * Property names that would be a leak if they ever appeared.
 *
 * Belt and braces, and deliberately so. The allowlist above is what enforces
 * the rule; this list exists to make a mistake LOUD rather than silent — a
 * developer who adds `headHeightMm` to an event gets a failing test naming the
 * exact problem rather than a quiet rejection they might paper over by adding
 * the key to the allowlist.
 */
export const FORBIDDEN_PROPERTY_PATTERNS: readonly RegExp[] = [
  /head/i,
  /eye/i,
  /face/i,
  /crown/i,
  /chin/i,
  /landmark/i,
  /pixel/i,
  /\bmm\b|millimetre|millimeter/i,
  /width|height/i,
  /ratio/i,
  /measure/i,
  /confidence/i,
  /image|photo(?!-)/i,
];

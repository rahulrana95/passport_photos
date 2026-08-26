import axeCore, { type AxeResults, type RunOptions } from 'axe-core';

const formatViolations = (results: AxeResults): string =>
  results.violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
      return `  [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}\n    at: ${targets}\n    ${violation.helpUrl}`;
    })
    .join('\n');

/**
 * Asserts a rendered container has no accessibility violations.
 *
 * Uses axe-core directly rather than a matcher library: the ecosystem wrappers
 * are unmaintained and do not augment Vitest's types, and a thrown Error gives a
 * more useful failure message than a matcher diff.
 */
export const expectNoAxeViolations = async (
  container: Element,
  options?: RunOptions,
): Promise<void> => {
  const results = await axeCore.run(container, options ?? {});

  if (results.violations.length > 0) {
    throw new Error(
      `Expected no accessibility violations, found ${results.violations.length}:\n${formatViolations(results)}`,
    );
  }
};

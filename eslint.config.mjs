import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import react from 'eslint-plugin-react';

// eslint-config-next v16 ships native flat configs. Do not route these through
// FlatCompat — the eslintrc shim cannot serialise the plugin graph on ESLint 10
// and crashes with a circular-structure error.
const eslintConfig = [
  { ignores: ['.next/**', 'coverage/**', 'storybook-static/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },

  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    rules: {
      // --- 100% TypeScript -------------------------------------------------
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',

      // --- No hardcoded values ---------------------------------------------
      // Colours are handled by stylelint (see .stylelintrc.json) because they
      // belong in CSS, never in TSX. This catches numeric literals.
      'no-magic-numbers': [
        'error',
        { ignore: [0, 1, -1], ignoreArrayIndexes: true, enforceConst: true, detectObjects: false },
      ],
      // Route literals must come from routes.constants.ts so a path can never
      // drift between a link, a canonical tag and the sitemap.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='href'] > Literal[value=/^\\//]",
          message: 'Use a route builder from routes.constants.ts instead of a literal path.',
        },
        {
          selector: "CallExpression[callee.property.name=/^(push|replace)$/] > Literal[value=/^\\//]",
          message: 'Use a route builder from routes.constants.ts instead of a literal path.',
        },
      ],
      // Barrel files hide dependencies and defeat tree-shaking.
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/index'], message: 'Import the module directly; barrel files are banned.' }] },
      ],
    },
  },

  {
    // Scoped to TSX, and the plugin registered here rather than borrowed.
    //
    // Both matter. Applied to every file, the rule reached config files that
    // eslint-config-next's globs do not cover, and ESLint refused to run at all
    // because the react plugin was unregistered for them — a lint suite taken
    // down by adding a .cjs file at the root. Declaring eslint-plugin-react
    // directly closes the other half: a rule we rely on should not depend on
    // what another preset happens to bundle transitively.
    files: ['**/*.tsx'],
    plugins: { react },
    rules: {
      // --- One component per file -------------------------------------------
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
    },
  },

  {
    // Tests may cast and may use literal numbers; that is the point of a test.
    files: ['**/*.test.{ts,tsx}', 'vitest.setup.ts', 'e2e/**/*.ts', '.storybook/**/*.{ts,tsx}', '**/*.stories.tsx'],
    rules: {
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'react/no-multi-comp': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  {
    // Config files legitimately carry literal values.
    files: ['*.config.{ts,mjs}', 'src/config/**', 'src/constants/**', 'src/theme/**'],
    rules: { 'no-magic-numbers': 'off' },
  },
];

export default eslintConfig;

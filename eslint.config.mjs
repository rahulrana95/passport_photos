import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import react from 'eslint-plugin-react';

// eslint-config-next v16 ships native flat configs. Do not route these through
// FlatCompat — the eslintrc shim cannot serialise the plugin graph on ESLint 10
// and crashes with a circular-structure error.
const eslintConfig = [
  // Both public/ entries are build output, gitignored, and not ours to change:
  // public/models is 34MB of prebuilt MediaPipe runtime fetched at build time,
  // and public/workers is the minified analysis worker esbuild writes from
  // src/analysis. Linting either produces thousands of errors about generated
  // code — and about the sources they came from, twice.
  { ignores: ['public/models/**', 'public/workers/**', '.next/**', 'coverage/**', 'storybook-static/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'] },

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
    // Constants files and fixture builders are where transcribed values live.
    //
    // no-magic-numbers exists to stop unexplained numbers appearing inside
    // logic. A file whose entire content is a named catalogue — the eight EXIF
    // orientation values, the leading bytes of a PNG, the fields of a JFIF
    // segment — is the place those numbers are supposed to be, and each is
    // already named and sourced by its own declaration. Requiring
    // `const ZERO_X_FF = 0xff` there would say strictly less than the
    // specification reference above it.
    //
    // Deliberately narrow: *.utils.ts and every component file stay covered,
    // which is why the format signatures were moved out of magic-bytes.utils.ts
    // rather than the rule relaxed around them.
    files: ['**/*.constants.ts', 'src/testing/fixtures/**/*.ts'],
    rules: { 'no-magic-numbers': 'off' },
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
    // A CommonJS file loads its dependencies with require, because that is what
    // CommonJS is. The rule exists to keep application code on ES modules; the
    // Lighthouse configs are .cjs because lhci loads them that way, and the
    // mobile one reads the desktop one rather than duplicating thresholds that
    // would then drift apart.
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
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

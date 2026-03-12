/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
    'plugin:react/recommended',
    'plugin:import/typescript',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  plugins: ['@stylistic', 'sonarjs', 'react-hooks'],
  settings: {
    'import/resolver': {
      alias: {
        map: [['@', './src']],
        extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
      },
    },
    'import/core-modules': ['virtual:__federation__'],
  },
  ignorePatterns: ['.eslintrc.cjs', '*.config.js', '*.config.ts', '**/assets/**'],
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
      rules: {
        'sonarjs/no-duplicate-string': 'off',
      },
    },
  ],
  rules: {
    'arrow-body-style': 'off',
    'comma-dangle': ['error', 'only-multiline'],
    quotes: ['error', 'single', { allowTemplateLiterals: true, avoidEscape: true }],
    'consistent-return': ['error', { treatUndefinedAsUnspecified: true }],
    camelcase: 'off',
    'func-names': 'off',
    'class-methods-use-this': 'off',

    'prefer-arrow-callback': 'off',
    'prefer-promise-reject-errors': 'off',
    'prefer-template': 'off' /* enable later */,
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],

    'no-underscore-dangle': 'off',
    'no-param-reassign': 'off',
    'no-console': 'off' /* enable later */,
    'no-debugger': 'error',
    'no-use-before-define': 'off',
    'no-unused-vars': 'off',
    'no-restricted-exports': 'off',
    'no-shadow': 'off' /* enable later */,
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      // 'ForOfStatement',
      'LabeledStatement',
      'WithStatement',
    ],

    '@stylistic/semi': ['error', 'never'],

    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off', // для React 17+
    'react/prop-types': 'off', // якщо використовуєте TypeScript
    'react/jsx-filename-extension': [1, { extensions: ['.tsx', '.jsx'] }],

    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-floating-promises': 'off' /* enable later */,
    '@typescript-eslint/await-thenable': 'off' /* enable later */,

    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'import/prefer-default-export': 'off' /* enable later */,
    'import/no-cycle': 'off' /* enable later */,
    'import/no-unresolved': ['error', { ignore: ['\\?react$'] }],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
          'object',
          'type',
        ],
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
            position: 'after',
          },
          {
            pattern: '*.{css,scss,sass,less,module.css,module.scss}',
            group: 'object',
            patternOptions: { matchBase: true },
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'off' /* enable later */,

    // SonarJS rules (errors, blocking)
    'sonarjs/cognitive-complexity': ['error', 15],
    'sonarjs/no-duplicate-string': ['error', { threshold: 9 }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-duplicated-branches': 'error',
    'sonarjs/no-gratuitous-expressions': 'error',
    'sonarjs/no-identical-conditions': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-unused-collection': 'error',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/prefer-object-literal': 'error',
  },
}

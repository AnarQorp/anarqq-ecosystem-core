module.exports = {
  root: true,
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
    'require-await': 'error',
    'no-return-await': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'object-shorthand': 'error',
    'prefer-destructuring': ['error', { object: true, array: false }],
    'prefer-template': 'error',
    'no-useless-rename': 'error',
    'no-duplicate-imports': 'error',
    'no-param-reassign': 'error',
    'no-multi-assign': 'error',
    'no-nested-ternary': 'error',
    'no-unneeded-ternary': 'error',
    'no-else-return': 'error',
    'spaced-comment': ['error', 'always', { markers: ['/'] }],
    'padding-line-between-statements': [
      'error',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
      { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};

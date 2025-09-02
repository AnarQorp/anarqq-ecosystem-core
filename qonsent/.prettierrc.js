module.exports = {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  bracketSameLine: false,
  singleAttributePerLine: true,
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 200,
      },
    },
  ],
};

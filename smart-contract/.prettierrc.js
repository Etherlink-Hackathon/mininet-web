module.exports = {
  semi: true,
  trailingComma: "es5",
  singleQuote: false,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  endOfLine: "lf",
  overrides: [
    {
      files: "*.sol",
      options: {
        printWidth: 100,
        tabWidth: 4,
        useTabs: false,
        singleQuote: false,
        bracketSpacing: true,
        explicitTypes: "always",
      },
    },
    {
      files: "*.ts",
      options: {
        semi: true,
        trailingComma: "es5",
        singleQuote: false,
        printWidth: 100,
        tabWidth: 2,
      },
    },
  ],
}; 
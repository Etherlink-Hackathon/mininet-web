module.exports = {
  env: {
    browser: false,
    es6: true,
    mocha: true,
    node: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/prefer-const": "error",
    "prefer-const": "off", // turn off the base rule as it conflicts with @typescript-eslint version
    "no-var": "error",
    "no-console": "off",
  },
  ignorePatterns: [
    "node_modules/",
    "artifacts/",
    "cache/",
    "coverage/",
    "typechain-types/",
    "dist/",
  ],
}; 
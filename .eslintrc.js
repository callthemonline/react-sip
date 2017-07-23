module.exports = {
  extends: ["eslint-config-airbnb"].map(require.resolve),
  parser: "babel-eslint",
  env: {
    browser: true,
    jest: true
  },
  plugins: ["react"],
  rules: {
    "arrow-body-style": "off",
    "arrow-parens": ["error", "always"],
    "class-methods-use-this": "warn",
    "dot-notation": "off",
    "no-confusing-arrow": "off",
    "no-mixed-operators": [
      "error",
      {
        groups: [["&", "|", "^", "~", "<<", ">>", ">>>"], ["&&", "||"]]
      }
    ],
    "no-multiple-empty-lines": ["error", {max: 2, maxEOF: 0}],
    "no-unused-expressions": ["error", {allowTaggedTemplates: true}],
    "quote-props": "off",
    "react/jsx-filename-extension": [
      "error",
      {
        extensions: [".js", ".jsx"]
      }
    ],
    "react/prefer-stateless-function": "warn",
    "react/prop-types": "warn",
    "react/require-default-props": "warn"
  }
}

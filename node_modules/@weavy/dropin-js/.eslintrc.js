/* eslint-env node */

module.exports = {
  "root": true,
  "env": {
    "browser": true,
    "es6": true
  },
  "extends": "eslint:recommended",
  "parser": "@babel/eslint-parser",
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module",
    "babelOptions": {
      "root": __dirname
    }
  },
  "ignorePatterns": ["node_modules/**/*", "dist/*"],
  "rules": {
    "no-empty": "warn",
    "eqeqeq": "warn",
    "no-unused-vars": [
      "warn",
      {
        "args": "none",
        "ignoreRestSiblings": true,
        "caughtErrors": "none"
      }
    ],
    "no-irregular-whitespace": [
      "error",
      {
        "skipComments": true,
        "skipTemplates": true
      }
    ]
  }
}


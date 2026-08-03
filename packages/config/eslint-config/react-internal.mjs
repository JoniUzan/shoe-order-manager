import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

import { baseConfig } from "./base.mjs";

/**
 * ESLint flat config for internal React library packages (e.g. @repo/ui).
 * @type {import("eslint").Linter.Config[]}
 */
export const reactInternalConfig = [
  ...baseConfig,
  {
    ...react.configs.flat.recommended,
    settings: { react: { version: "detect" } },
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];

export default reactInternalConfig;

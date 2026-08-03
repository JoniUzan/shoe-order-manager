import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turbo from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Shared base ESLint flat config for the repo.
 * @type {import("eslint").Linter.Config[]}
 */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { turbo },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  eslintConfigPrettier,
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "src/generated/**"],
  },
];

export default baseConfig;

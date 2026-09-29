import { nextConfig } from "@repo/eslint-config/next";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextConfig,
  // Playwright fixtures hand values on with a function named `use`.
  { files: ["e2e/**"], rules: { "react-hooks/rules-of-hooks": "off" } },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "test-results/**", "playwright-report/**", "next-env.d.ts"]),
]);

export default eslintConfig;

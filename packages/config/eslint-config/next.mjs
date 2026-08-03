import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { baseConfig } from "./base.mjs";

/**
 * ESLint flat config for the Next.js app.
 * @type {import("eslint").Linter.Config[]}
 */
export const nextConfig = [
  ...baseConfig,
  ...nextVitals,
  ...nextTs,
];

export default nextConfig;

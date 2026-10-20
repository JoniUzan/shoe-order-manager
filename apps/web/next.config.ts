import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/domain", "@repo/db"],
  // react-pdf loads fontkit and yoga at runtime; bundling them breaks both.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: {
      // A Product image arrives as a cropped 1024px JPEG (a few hundred KB);
      // the action refuses anything over 1.5MB, so leave room for that plus
      // the multipart overhead.
      bodySizeLimit: "2mb",
    },
  },
  // The PDF fonts are read from disk by path, which file tracing can't see.
  outputFileTracingIncludes: {
    "/api/orders/[id]/pdf": ["./src/lib/pdf/fonts/**"],
  },
};

// Uploads the browser and server source maps to Sentry on the production build
// (deploy.yml sets SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT) and deletes them
// from the output. Without the token, as locally and in CI tests, it skips that.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
  // Browser events go through our own server, so ad blockers don't drop them.
  // Under /api so the locale proxy leaves it alone.
  tunnelRoute: "/api/monitoring",
  silent: !process.env.CI,
  // That hook only feeds tracing, which is off (errors only).
  suppressOnRouterTransitionStartWarning: true,
  telemetry: false,
});

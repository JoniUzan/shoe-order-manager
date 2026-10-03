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

export default withNextIntl(nextConfig);

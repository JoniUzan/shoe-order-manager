import * as Sentry from "@sentry/nextjs";

// Browser errors, the same errors-only setup as the server (instrumentation.ts).
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });

import * as Sentry from "@sentry/nextjs";

// Errors only: no tracing, no replay, no request bodies or IPs (sendDefaultPii
// stays off). Without a DSN (local dev, tests, e2e) Sentry stays off.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN });
  }
}

// Errors thrown in Server Components, route handlers, Server Actions and the proxy.
export const onRequestError = Sentry.captureRequestError;

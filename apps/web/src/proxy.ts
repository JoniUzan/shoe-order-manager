import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, the auth API, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

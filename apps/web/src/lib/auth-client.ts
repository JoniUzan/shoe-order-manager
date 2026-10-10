import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./auth";

/**
 * The browser side of Better Auth. Sign-in and sign-up go through its
 * endpoints, not Server Actions, so its rate limiter sees them.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

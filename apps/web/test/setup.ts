import { vi } from "vitest";

import { session, sessionToken } from "./session";

// Server Actions read the signed-in User from Better Auth; tests pick who that
// is with `signInAs` (test/session.ts). The auth endpoints themselves are
// tested against a real instance in src/lib/auth.test.ts.
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(async () =>
    session.userId
      ? { user: { id: session.userId }, session: { token: sessionToken(session.userId) } }
      : null,
  ),
  auth: { api: { signOut: vi.fn() } },
}));

// No Next request cache or request headers outside a Next server.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

import { vi } from "vitest";

import { session } from "./session";

// Server Actions read the signed-in User from Auth.js; tests pick who that is
// with `signInAs` (test/session.ts).
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () =>
    session.userId ? { user: { id: session.userId } } : null,
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// No Next request cache or request headers outside a Next server.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-real-ip": session.ip })),
}));

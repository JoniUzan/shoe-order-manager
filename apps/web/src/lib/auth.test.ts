import { randomInt } from "node:crypto";

import { authOptions, PUBLIC_AUTH_PATHS } from "@repo/auth";
import { prisma } from "@repo/db";
import { betterAuth } from "better-auth";
import { verifyPassword } from "better-auth/crypto";
import { describe, expect, it } from "vitest";

import { uniqueEmail } from "../../test/factories";

// The real config, as the web app mounts it minus Next's cookie helper, called
// over HTTP the way the forms (and later the mobile app) call it.
const BASE = "http://localhost:3000";
const auth = betterAuth({
  ...authOptions,
  baseURL: BASE,
  secret: "test-secret-for-the-integration-tests-only",
});

/** A fresh client address, so each test has its own rate-limit buckets. */
function newIp() {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}`;
}

function post(path: string, body: object, ip = newIp()) {
  return auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: BASE, "x-real-ip": ip },
      body: JSON.stringify(body),
    }),
  );
}

const PASSWORD = "password123";
const signup = (over: object = {}) => ({
  name: "Dana",
  email: uniqueEmail(),
  password: PASSWORD,
  locale: "en",
  ...over,
});

describe("sign-up", () => {
  it("creates a User that isn't onboarded yet, with a credential account, and signs them in", async () => {
    const input = signup();
    const res = await post("/sign-up/email", { ...input, email: input.email.toUpperCase() });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain("better-auth.session_token=");

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: input.email },
      include: { accounts: true, sessions: true },
    });
    expect(user).toMatchObject({ name: "Dana", locale: "en", onboardedAt: null });
    // Prisma's cuid, like every other table.
    expect(user.id).toMatch(/^c[a-z0-9]{16,}$/);
    expect(user.accounts).toHaveLength(1);
    expect(user.accounts[0]!.providerId).toBe("credential");
    expect(await verifyPassword({ hash: user.accounts[0]!.password!, password: PASSWORD })).toBe(true);

    // 30 days, renewed while used.
    const days = (user.sessions[0]!.expiresAt.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it("refuses what the sign-up schema refuses, even when the form is skipped", async () => {
    for (const bad of [{ name: " " }, { password: "short" }, { locale: "xx" }]) {
      expect((await post("/sign-up/email", signup(bad))).status).toBe(400);
    }
  });

  it("refuses a taken email in any case", async () => {
    const input = signup();
    await post("/sign-up/email", input);
    const res = await post("/sign-up/email", { ...input, email: input.email.toUpperCase() });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" });
  });

  it("allows 5 sign-ups per IP an hour", async () => {
    const ip = newIp();
    for (let i = 0; i < 5; i++) {
      expect((await post("/sign-up/email", signup(), ip)).status).toBe(200);
    }
    expect((await post("/sign-up/email", signup(), ip)).status).toBe(429);
    expect((await post("/sign-up/email", signup())).status).toBe(200);
  });
});

describe("sign-in", () => {
  it("signs in with the email in any case and returns the saved language", async () => {
    const input = signup({ locale: "he" });
    await post("/sign-up/email", input);
    const res = await post("/sign-in/email", { email: input.email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ user: { locale: "he" } });
  });

  it("refuses a wrong password", async () => {
    const input = signup();
    await post("/sign-up/email", input);
    const res = await post("/sign-in/email", { email: input.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("allows 10 sign-in attempts per IP in 15 minutes", async () => {
    const ip = newIp();
    const attempt = { email: uniqueEmail(), password: "wrong-password" };
    for (let i = 0; i < 10; i++) {
      expect((await post("/sign-in/email", attempt, ip)).status).toBe(401);
    }
    expect((await post("/sign-in/email", attempt, ip)).status).toBe(429);
    expect((await post("/sign-in/email", attempt)).status).toBe(401);
  });
});

describe("endpoints", () => {
  // Every endpoint this Better Auth version has, as the router serves it. A
  // version that adds one shows up here, and it must answer 404 unless it's
  // been added to PUBLIC_AUTH_PATHS on purpose.
  const endpoints = Object.values(auth.api)
    .filter((e) => typeof e.path === "string")
    .map((e) => {
      const method = e.options.method;
      return { path: e.path!, method: Array.isArray(method) ? method[0]! : method };
    });

  it.each(endpoints)("$method $path answers only if it's allowed", async ({ path, method }) => {
    const url = `${BASE}/api/auth${path.replace(/:[^/]+/g, "x")}`;
    const res = await auth.handler(
      new Request(url, {
        method,
        headers: { "content-type": "application/json", origin: BASE, "x-real-ip": newIp() },
        body: method === "GET" ? undefined : "{}",
      }),
    );
    if (PUBLIC_AUTH_PATHS.includes(path)) expect(res.status).not.toBe(404);
    else expect(res.status).toBe(404);
  });

  it("lists every allowed path among the endpoints", () => {
    expect(endpoints.map((e) => e.path)).toEqual(expect.arrayContaining([...PUBLIC_AUTH_PATHS]));
  });

  it("leaves server-side calls alone", async () => {
    // The web app's sign-out runs on the server through auth.api.
    const input = signup();
    const res = await post("/sign-up/email", input);
    const cookie = res.headers.get("set-cookie")!.split(";")[0]!;
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.email).toBe(input.email);
  });
});

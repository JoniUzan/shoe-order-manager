import { randomUUID } from "node:crypto";

/** Who the mocked `auth()` says is signed in, and the request's IP. */
export const session: { userId: string | null; ip: string } = {
  userId: null,
  ip: "test",
};

export function signInAs(userId: string | null) {
  session.userId = userId;
}

/** A fresh IP, so each sign-up test has its own rate-limit bucket. */
export function newIp() {
  session.ip = `test-${randomUUID()}`;
  return session.ip;
}

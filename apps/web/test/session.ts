/** Who the mocked `getSession()` says is signed in. */
export const session: { userId: string | null } = {
  userId: null,
};

export function signInAs(userId: string | null) {
  session.userId = userId;
}

/** The token of the session the mock hands out for a User. */
export function sessionToken(userId: string) {
  return `test-session-${userId}`;
}

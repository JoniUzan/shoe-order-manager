/** Who the mocked `getSession()` says is signed in. */
export const session: { userId: string | null } = {
  userId: null,
};

export function signInAs(userId: string | null) {
  session.userId = userId;
}

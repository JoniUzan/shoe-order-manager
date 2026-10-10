import { prisma } from "@repo/db";
import { hashPassword, verifyPassword } from "better-auth/crypto";

/**
 * Email + password sign-in is Better Auth's `credential` account, which holds
 * the hash. Hashing is Better Auth's own (scrypt), so what these write is what
 * its sign-in reads.
 */
const CREDENTIAL = "credential";

/**
 * Checks the User's current password, for changes to how they sign in.
 * null when the User is gone.
 */
export async function passwordMatches(
  userId: string,
  password: string,
): Promise<boolean | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accounts: { where: { providerId: CREDENTIAL }, select: { password: true } },
    },
  });
  if (!user) return null;
  const hash = user.accounts[0]?.password;
  return !!hash && (await verifyPassword({ hash, password }));
}

/**
 * Sets a new password and ends every other session of the User: a device
 * someone else signed in on stops working. The session it's called from
 * stays signed in. Web sessions answered from the cookie cache live on for
 * up to its 5 minutes.
 */
export async function replacePassword(
  userId: string,
  password: string,
  keepSessionToken: string,
) {
  const hash = await hashPassword(password);
  await prisma.$transaction([
    prisma.account.updateMany({
      where: { userId, providerId: CREDENTIAL },
      data: { password: hash },
    }),
    prisma.session.deleteMany({ where: { userId, token: { not: keepSessionToken } } }),
  ]);
}

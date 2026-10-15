// For running it with plain `tsx` too (`prisma db seed` loads .env itself).
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/client";

async function main() {
  // Order statuses aren't seeded: a migration creates them (20261015090000_order_statuses).

  // --- Admin (the father's) account: development only ---
  // Production has no well-known login; its first User signs up.
  if (process.env.NODE_ENV === "production") return;

  // Better Auth looks emails up lower-cased.
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.ADMIN_NAME ?? "Owner";

  if (!(await prisma.user.findUnique({ where: { email }, select: { id: true } }))) {
    const user = await prisma.user.create({
      // Already onboarded: the admin never sees the welcome dialog.
      data: { email, name, locale: "he", onboardedAt: new Date() },
    });
    // Email + password sign-in is Better Auth's `credential` account.
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(password),
      },
    });
  }
  console.log(`✓ Admin user ready: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  (default password "changeme123" — set ADMIN_PASSWORD to override)`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

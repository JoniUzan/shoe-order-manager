// For running it with plain `tsx` too (`prisma db seed` loads .env itself).
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/client";

async function main() {
  // --- Order statuses (v1: not_done / done; extend later by adding rows) ---
  const statuses = [
    { code: "not_done", labelEn: "Not done", labelHe: "לא הושלם", sortOrder: 10, isTerminal: false },
    { code: "done", labelEn: "Done", labelHe: "הושלם", sortOrder: 20, isTerminal: true },
  ];
  for (const s of statuses) {
    await prisma.orderStatus.upsert({
      where: { code: s.code },
      update: { labelEn: s.labelEn, labelHe: s.labelHe, sortOrder: s.sortOrder, isTerminal: s.isTerminal },
      create: s,
    });
  }
  console.log(`✓ Seeded ${statuses.length} order statuses`);

  // --- Admin (the father's) account ---
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.ADMIN_NAME ?? "Owner";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    // Already onboarded: the admin never sees the welcome dialog.
    create: { email, name, passwordHash, locale: "he", onboardedAt: new Date() },
  });
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

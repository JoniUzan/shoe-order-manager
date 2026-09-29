import { prisma } from "@repo/db";

/** The User's row as stored, for polling on an autosave. */
export function storedUser(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

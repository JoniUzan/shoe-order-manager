-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SignupAttempt" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignupAttempt_ip_createdAt_idx" ON "SignupAttempt"("ip", "createdAt");

-- Everyone who already has an account is past onboarding (the seeded admin
-- never sees the welcome dialog). A one-off data fix, not a DB default.
UPDATE "User" SET "onboardedAt" = CURRENT_TIMESTAMP;

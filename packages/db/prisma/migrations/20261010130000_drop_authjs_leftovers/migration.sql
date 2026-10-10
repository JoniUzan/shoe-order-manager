-- Passwords live on Better Auth's credential Account, and its RateLimit table
-- replaced the sign-up throttle.
-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwordHash";

-- DropTable
DROP TABLE "SignupAttempt";


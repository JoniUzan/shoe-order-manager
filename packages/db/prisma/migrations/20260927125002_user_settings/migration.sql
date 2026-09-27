-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessTaxId" TEXT,
ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'system';

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShoeModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "defaultPriceAgorot" INTEGER,
    "sizes" TEXT,
    "sizeFormat" TEXT NOT NULL DEFAULT 'eu',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShoeModel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShoeModel" ("createdAt", "defaultPriceAgorot", "description", "id", "isActive", "name", "ownerId", "sizes", "sku", "updatedAt") SELECT "createdAt", "defaultPriceAgorot", "description", "id", "isActive", "name", "ownerId", "sizes", "sku", "updatedAt" FROM "ShoeModel";
DROP TABLE "ShoeModel";
ALTER TABLE "new_ShoeModel" RENAME TO "ShoeModel";
CREATE INDEX "ShoeModel_ownerId_idx" ON "ShoeModel"("ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packId" TEXT;

-- CreateTable
CREATE TABLE "SizePack" (
    "id" TEXT NOT NULL,
    "shoeModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "curve" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPack" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sizePackId" TEXT,
    "packName" TEXT NOT NULL,
    "curve" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "OrderPack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SizePack_shoeModelId_idx" ON "SizePack"("shoeModelId");

-- CreateIndex
CREATE INDEX "OrderPack_orderId_idx" ON "OrderPack"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_packId_idx" ON "OrderItem"("packId");

-- AddForeignKey
ALTER TABLE "SizePack" ADD CONSTRAINT "SizePack_shoeModelId_fkey" FOREIGN KEY ("shoeModelId") REFERENCES "ShoeModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_packId_fkey" FOREIGN KEY ("packId") REFERENCES "OrderPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPack" ADD CONSTRAINT "OrderPack_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPack" ADD CONSTRAINT "OrderPack_sizePackId_fkey" FOREIGN KEY ("sizePackId") REFERENCES "SizePack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

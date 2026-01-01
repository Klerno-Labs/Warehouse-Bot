-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UomKind" AS ENUM ('COUNT', 'LENGTH', 'VOLUME', 'WEIGHT', 'AREA', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('RECEIVE', 'MOVE', 'ISSUE', 'ADJUST', 'COUNT');

-- CreateEnum
CREATE TYPE "AdjustDirection" AS ENUM ('ADD', 'SUBTRACT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Uom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "UomKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Uom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "specs" JSONB,
    "baseUomId" TEXT NOT NULL,
    "defaultLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemUomConversion" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromUomId" TEXT NOT NULL,
    "toUomId" TEXT NOT NULL,
    "factor" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "ItemUomConversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTxn" (
    "id" TEXT NOT NULL,
    "type" "InventoryTxnType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(18,4) NOT NULL,
    "uomId" TEXT NOT NULL,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "note" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "direction" "AdjustDirection",
    "countedQtyBase" DECIMAL(18,4),
    "deltaBase" DECIMAL(18,4),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "qtyBase" DECIMAL(18,4) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Uom_code_key" ON "Uom"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_publicCode_key" ON "Item"("publicCode");

-- CreateIndex
CREATE UNIQUE INDEX "Item_sku_key" ON "Item"("sku");

-- CreateIndex
CREATE INDEX "Item_name_idx" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUomConversion_itemId_fromUomId_toUomId_key" ON "ItemUomConversion"("itemId", "fromUomId", "toUomId");

-- CreateIndex
CREATE INDEX "InventoryTxn_itemId_createdAt_idx" ON "InventoryTxn"("itemId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_itemId_locationId_key" ON "StockBalance"("itemId", "locationId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_baseUomId_fkey" FOREIGN KEY ("baseUomId") REFERENCES "Uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUomConversion" ADD CONSTRAINT "ItemUomConversion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUomConversion" ADD CONSTRAINT "ItemUomConversion_fromUomId_fkey" FOREIGN KEY ("fromUomId") REFERENCES "Uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemUomConversion" ADD CONSTRAINT "ItemUomConversion_toUomId_fkey" FOREIGN KEY ("toUomId") REFERENCES "Uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "Uom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxn" ADD CONSTRAINT "InventoryTxn_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add UX Redesign Fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "industry" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "companySize" TEXT;

-- Add UX Redesign Fields to ProductionOrder
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "stationId" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "itemName" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "completedBy" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "pausedBy" TEXT;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "resumedAt" TIMESTAMP;
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "estimatedDuration" INTEGER;

-- Update ProductionOrderStatus enum to include PENDING and PAUSED
ALTER TYPE "ProductionOrderStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ProductionOrderStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "ProductionOrder_departmentId_idx" ON "ProductionOrder"("departmentId");
CREATE INDEX IF NOT EXISTS "ProductionOrder_assignedTo_idx" ON "ProductionOrder"("assignedTo");
CREATE INDEX IF NOT EXISTS "ProductionOrder_customerId_idx" ON "ProductionOrder"("customerId");

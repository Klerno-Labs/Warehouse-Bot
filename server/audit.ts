import { storage } from "./storage";

export async function audit(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: string,
  ipAddress?: string,
) {
  await storage.createAuditEvent({
    tenantId,
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress: ipAddress || null,
  });
}

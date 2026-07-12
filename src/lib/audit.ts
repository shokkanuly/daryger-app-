import { db } from "./db";

export async function logAction(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata?: any
) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

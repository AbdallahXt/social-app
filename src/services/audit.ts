import { Types } from 'mongoose';
import { AuditLog, AuditAction, AuditTarget } from '../models/AuditLog';

export async function logAudit(params: {
  actor: string | Types.ObjectId;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string | Types.ObjectId;
  reason?: string;
}) {
  const { actor, action, targetType, targetId, reason } = params;
  await AuditLog.create({ actor, action, targetType, targetId, reason });
}

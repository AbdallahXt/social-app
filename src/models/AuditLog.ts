import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type AuditAction = 'freeze' | 'unfreeze' | 'hard_delete';
export type AuditTarget = 'post' | 'comment';

export interface IAuditLog extends Document {
  actor: Types.ObjectId;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: Types.ObjectId;
  reason?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: ['freeze', 'unfreeze', 'hard_delete'], required: true },
    targetType: { type: String, enum: ['post', 'comment'], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    reason: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

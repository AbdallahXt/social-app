import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId; // recipient
  type: string;
  targetType?: 'post' | 'comment';
  targetId?: Types.ObjectId;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    targetType: { type: String, enum: ['post', 'comment'] },
    targetId: { type: Schema.Types.ObjectId },
    data: Schema.Types.Mixed,
    read: { type: Boolean, default: false }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ targetType: 1, targetId: 1 });

export const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

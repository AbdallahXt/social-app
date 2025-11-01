import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IChatMessage extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  content: string;
  readAt?: Date;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    readAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ from: 1, to: 1, createdAt: -1 });

export const ChatMessage: Model<IChatMessage> = mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

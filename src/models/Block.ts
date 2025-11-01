import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IBlock extends Document {
  blocker: Types.ObjectId;
  blocked: Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    blocker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block: Model<IBlock> = mongoose.models.Block || mongoose.model<IBlock>('Block', BlockSchema);

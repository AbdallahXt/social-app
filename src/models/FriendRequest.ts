import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface IFriendRequest extends Document {
  from: Types.ObjectId;
  to: Types.ObjectId;
  status: FriendRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true }
  },
  { timestamps: true }
);

FriendRequestSchema.index({ from: 1, to: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } as any });

export const FriendRequest: Model<IFriendRequest> = mongoose.models.FriendRequest || mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);

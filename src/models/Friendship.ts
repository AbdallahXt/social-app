import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFriendship extends Document {
  user1: Types.ObjectId;
  user2: Types.ObjectId;
  createdAt: Date;
}

const FriendshipSchema = new Schema<IFriendship>(
  {
    user1: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    user2: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FriendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });
FriendshipSchema.index({ user2: 1, user1: 1 }, { unique: true });

export const Friendship: Model<IFriendship> = mongoose.models.Friendship || mongoose.model<IFriendship>('Friendship', FriendshipSchema);

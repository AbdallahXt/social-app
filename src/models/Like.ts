import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ILike extends Document {
  user: Types.ObjectId;
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  createdAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', index: true },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

LikeSchema.index({ user: 1, post: 1 }, { unique: true, partialFilterExpression: { post: { $type: 'objectId' } } });
LikeSchema.index({ user: 1, comment: 1 }, { unique: true, partialFilterExpression: { comment: { $type: 'objectId' } } });

export const Like: Model<ILike> = mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);

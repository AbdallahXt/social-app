import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IComment extends Document {
  post: Types.ObjectId;
  author: Types.ObjectId;
  parentComment?: Types.ObjectId;
  content: string;
  isFrozen: boolean;
  frozenBy?: Types.ObjectId;
  frozenReason?: string;
  frozenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', index: true },
    content: { type: String, required: true },
    isFrozen: { type: Boolean, default: false },
    frozenBy: { type: Schema.Types.ObjectId, ref: 'User' },
    frozenReason: String,
    frozenAt: Date
  },
  { timestamps: true }
);

export const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

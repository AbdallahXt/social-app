import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPost extends Document {
  author: Types.ObjectId;
  content: string;
  media?: string[];
  tags?: string[];
  isFrozen: boolean;
  frozenBy?: Types.ObjectId;
  frozenReason?: string;
  frozenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    media: [String],
    tags: [String],
    isFrozen: { type: Boolean, default: false },
    frozenBy: { type: Schema.Types.ObjectId, ref: 'User' },
    frozenReason: String,
    frozenAt: Date
  },
  { timestamps: true }
);

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

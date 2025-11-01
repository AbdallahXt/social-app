import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISavedItem extends Document {
  user: Types.ObjectId;
  post: Types.ObjectId;
  createdAt: Date;
}

const SavedItemSchema = new Schema<ISavedItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SavedItemSchema.index({ user: 1, post: 1 }, { unique: true });

export const SavedItem: Model<ISavedItem> = mongoose.models.SavedItem || mongoose.model<ISavedItem>('SavedItem', SavedItemSchema);

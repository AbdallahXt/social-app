import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  user: Types.ObjectId;
  jti: string;
  hashedToken: string;
  expiresAt: Date;
  revoked: boolean;
  replacedByToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, index: true },
    hashedToken: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revoked: { type: Boolean, default: false },
    replacedByToken: String
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ user: 1, jti: 1 }, { unique: true });

export const RefreshToken: Model<IRefreshToken> = mongoose.models.RefreshToken || mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);

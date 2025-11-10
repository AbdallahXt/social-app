import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash?: string; // Optional for Google OAuth users
  name: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  location?: string;
  tags?: string[];
  role: 'user' | 'admin';
  emailVerified: boolean;
  emailVerifyToken?: string;
  emailVerifyExpires?: Date;
  emailVerifyOTPCodeHash?: string;
  emailVerifyOTPExpires?: Date;
  // Google OAuth
  googleId?: string;
  // email change
  emailChangeToken?: string;
  emailChangeNewEmail?: string;
  emailChangeExpires?: Date;
  // 2FA
  is2FAEnabled: boolean;
  totpSecret?: string;
  backupCodes?: string[]; // hashed
  email2FAEnabled?: boolean;
  email2FACodeHash?: string;
  email2FAExpires?: Date;
  // password reset
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: false }, // Optional for Google OAuth users
    name: { type: String, required: true },
    avatar: String,
    bio: String,
    phone: String,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    location: String,
    tags: [String],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: String,
    emailVerifyExpires: Date,
    emailVerifyOTPCodeHash: String,
    emailVerifyOTPExpires: Date,
    googleId: { type: String, unique: true, sparse: true, index: true }, // Sparse index allows multiple nulls
    emailChangeToken: String,
    emailChangeNewEmail: String,
    emailChangeExpires: Date,
    is2FAEnabled: { type: Boolean, default: false },
    totpSecret: String,
    backupCodes: [String],
    email2FAEnabled: { type: Boolean, default: false },
    email2FACodeHash: String,
    email2FAExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date
  },
  { timestamps: true }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

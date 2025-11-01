import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISession extends Document {
  user: Types.ObjectId;
  // Authentication method
  authMethod: 'password' | 'google' | 'facebook' | 'twitter' | 'apple';
  // Session data
  accessToken?: string; // JWT access token (hashed or just reference)
  refreshTokenJti?: string; // Reference to RefreshToken jti
  deviceInfo?: {
    userAgent?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown';
    browser?: string;
    os?: string;
    ipAddress?: string;
  };
  // OAuth specific data
  oauthProvider?: 'google' | 'facebook' | 'twitter' | 'apple';
  oauthProviderId?: string; // Provider's user ID
  oauthData?: {
    email?: string;
    name?: string;
    picture?: string;
    locale?: string;
    [key: string]: any; // For additional provider-specific data
  };
  // Session status
  isActive: boolean;
  lastActivity: Date;
  expiresAt?: Date;
  // Location data (optional)
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  // Security flags
  isSuspicious?: boolean;
  loginAttempt?: {
    success: boolean;
    failureReason?: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authMethod: {
      type: String,
      enum: ['password', 'google', 'facebook', 'twitter', 'apple'],
      required: true,
      index: true
    },
    accessToken: String, // Store hashed or just a reference
    refreshTokenJti: { type: String, index: true }, // Reference to RefreshToken
    deviceInfo: {
      userAgent: String,
      deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'] },
      browser: String,
      os: String,
      ipAddress: String
    },
    oauthProvider: { type: String, enum: ['google', 'facebook', 'twitter', 'apple'] },
    oauthProviderId: String,
    oauthData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    isActive: { type: Boolean, default: true, index: true },
    lastActivity: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, index: true },
    location: {
      country: String,
      city: String,
      timezone: String
    },
    isSuspicious: { type: Boolean, default: false },
    loginAttempt: {
      success: Boolean,
      failureReason: String,
      timestamp: Date
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
SessionSchema.index({ user: 1, isActive: 1 });
SessionSchema.index({ user: 1, createdAt: -1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired sessions
SessionSchema.index({ 'deviceInfo.ipAddress': 1 });
SessionSchema.index({ oauthProvider: 1, oauthProviderId: 1 });

export const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);


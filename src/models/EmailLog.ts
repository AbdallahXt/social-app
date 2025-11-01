import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  template: string;
  tags?: string[]; // metadata tags
  recipientTags?: string[]; // selection tags used for audience
  context?: Record<string, any>;
  sentAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    tags: [String],
    recipientTags: [String],
    context: Schema.Types.Mixed
  },
  { timestamps: { createdAt: 'sentAt', updatedAt: false } }
);

export const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

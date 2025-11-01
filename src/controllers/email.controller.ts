import { Request, Response } from 'express';
import { sendEmail } from '../services/email';
import { User } from '../models/User';
import { EmailLog } from '../models/EmailLog';

export async function sendEmailController(req: Request, res: Response) {
  const { to, subject, template, context, tags } = req.body;
  await sendEmail({ to, subject, template, context, tags });
  await EmailLog.create({ to, subject, template, context, tags });
  return res.json({ status: 'sent' });
}

export async function sendEmailByTagController(req: Request, res: Response) {
  const { recipientTags, subject, template, context, tags } = req.body as {
    recipientTags: string[];
    subject: string;
    template: string;
    context?: Record<string, any>;
    tags?: string[];
  };
  const users = await User.find({ tags: { $in: recipientTags } }).select('email');
  const emails = Array.from(new Set(users.map((u) => u.email).filter(Boolean)));
  for (const to of emails) {
    await sendEmail({ to, subject, template, context, tags });
    await EmailLog.create({ to, subject, template, context, tags, recipientTags });
  }
  return res.json({ status: 'sent', count: emails.length });
}

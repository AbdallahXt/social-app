import { z } from 'zod';
import { msg } from '../utils/i18n';

export const sendEmailSchema = {
  body: z.object({
    to: z.string({ required_error: msg('Recipient is required', 'المرسل إليه مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح')),
    subject: z.string({ required_error: msg('Subject is required', 'الموضوع مطلوب') }).min(1),
    template: z.string({ required_error: msg('Template is required', 'القالب مطلوب') }).min(1),
    context: z.record(z.any()).optional(),
    tags: z.array(z.string().max(32)).optional()
  })
};

export const sendEmailByTagSchema = {
  body: z.object({
    recipientTags: z.array(z.string().min(1, msg('Tag required', 'الوسم مطلوب'))).min(1, msg('At least one tag', 'وسم واحد على الأقل')),
    subject: z.string({ required_error: msg('Subject is required', 'الموضوع مطلوب') }).min(1),
    template: z.string({ required_error: msg('Template is required', 'القالب مطلوب') }).min(1),
    context: z.record(z.any()).optional(),
    tags: z.array(z.string().max(32)).optional()
  })
};

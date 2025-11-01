import { z } from 'zod';
import { msg } from '../utils/i18n';

export const sendMessageSchema = {
  body: z.object({
    to: z.string({ required_error: msg('Recipient is required', 'المرسل إليه مطلوب') }).min(1),
    content: z.string({ required_error: msg('Content is required', 'المحتوى مطلوب') }).min(1, msg('Message cannot be empty', 'لا يمكن أن تكون الرسالة فارغة'))
  })
};

export const getMessagesSchema = {
  params: z.object({ userId: z.string({ required_error: msg('userId is required', 'معرّف المستخدم مطلوب') }).min(1) }),
  query: z.object({
    limit: z.string().optional(),
    before: z.string().optional()
  })
};

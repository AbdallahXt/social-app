import { z } from 'zod';
import { msg } from '../utils/i18n';

export const idParamSchema = { params: z.object({ id: z.string().length(24, msg('Invalid id', 'معرف غير صالح')) }) };

export const createPostSchema = {
  body: z.object({
    content: z.string({ required_error: msg('Content is required', 'المحتوى مطلوب') }).min(1, msg('Content is required', 'المحتوى مطلوب')),
    media: z.array(z.string().url(msg('Invalid URL', 'رابط غير صالح'))).optional()
  })
};

export const updatePostSchema = {
  ...idParamSchema,
  body: z
    .object({
      content: z.string().min(1, msg('Content is required', 'المحتوى مطلوب')).optional(),
      media: z.array(z.string().url(msg('Invalid URL', 'رابط غير صالح'))).optional()
    })
    .refine((data) => Object.keys(data).length > 0, msg('No changes provided', 'لا توجد تغييرات'))
};

export const freezeSchema = { ...idParamSchema, body: z.object({ reason: z.string().max(200, msg('Too long', 'طويل جداً')).optional() }) };

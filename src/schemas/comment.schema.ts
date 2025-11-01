import { z } from 'zod';
import { msg } from '../utils/i18n';

export const idParamSchema = { params: z.object({ id: z.string().length(24, msg('Invalid id', 'معرف غير صالح')) }) };

export const createCommentSchema = {
  body: z.object({
    postId: z.string({ required_error: msg('postId is required', 'مُعرف المنشور مطلوب') }).length(24, msg('Invalid id', 'معرف غير صالح')),
    parentComment: z.string().length(24, msg('Invalid id', 'معرف غير صالح')).optional(),
    content: z.string({ required_error: msg('Content is required', 'المحتوى مطلوب') }).min(1, msg('Content is required', 'المحتوى مطلوب'))
  })
};

export const updateCommentSchema = {
  ...idParamSchema,
  body: z.object({ content: z.string({ required_error: msg('Content is required', 'المحتوى مطلوب') }).min(1, msg('Content is required', 'المحتوى مطلوب')) })
};

export const freezeSchema = { ...idParamSchema, body: z.object({ reason: z.string().max(200, msg('Too long', 'طويل جداً')).optional() }) };

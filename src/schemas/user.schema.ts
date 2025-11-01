import { z } from 'zod';
import { msg } from '../utils/i18n';

export const updateProfileSchema = {
  body: z.object({
    name: z.string().min(1, msg('Name required', 'الاسم مطلوب')).optional(),
    avatar: z.string().url(msg('Invalid URL', 'رابط غير صالح')).optional(),
    bio: z.string().max(500, msg('Max 500 chars', 'أقصى 500 حرف')).optional(),
    phone: z.string().max(20, msg('Invalid phone', 'رقم هاتف غير صالح')).optional(),
    gender: z.enum(['male', 'female', 'other'], { invalid_type_error: msg('Invalid gender', 'جنس غير صالح') }).optional(),
    location: z.string().max(120, msg('Too long', 'طويل جداً')).optional()
  })
};

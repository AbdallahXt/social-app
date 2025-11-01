import { z } from 'zod';
import { msg } from '../utils/i18n';

export const idParamSchema = { params: z.object({ userId: z.string().length(24, msg('Invalid id', 'معرف غير صالح')) }) };
export const friendRequestIdParamSchema = { params: z.object({ id: z.string().length(24, msg('Invalid id', 'معرف غير صالح')) }) };

import { z } from 'zod';
import { msg } from '../utils/i18n';

export const registerSchema = {
  body: z.object({
    email: z.string({ required_error: msg('Email is required', 'البريد الإلكتروني مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح')),
    password: z.string({ required_error: msg('Password is required', 'كلمة المرور مطلوبة') }).min(8, msg('Password must be at least 8 chars', 'يجب أن تكون كلمة المرور 8 أحرف على الأقل')),
    name: z.string({ required_error: msg('Name is required', 'الاسم مطلوب') }).min(1, msg('Name is required', 'الاسم مطلوب'))
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(msg('Invalid email', 'بريد إلكتروني غير صالح')),
    password: z.string(),
    totp: z.string().length(6).optional(),
    backupCode: z.string().length(10).optional(),
    emailCode: z.string().length(6).optional()
  })
};

export const refreshSchema = {
  body: z.object({ refreshToken: z.string({ required_error: msg('refreshToken is required', 'رمز التحديث مطلوب') }) })
};

export const updatePasswordSchema = {
  body: z.object({
    oldPassword: z.string({ required_error: msg('oldPassword is required', 'كلمة المرور القديمة مطلوبة') }),
    newPassword: z.string({ required_error: msg('newPassword is required', 'كلمة المرور الجديدة مطلوبة') }).min(8, msg('Min 8 characters', 'ثمانية أحرف على الأقل'))
  })
};

export const twoFASetupSchema = {
  body: z.object({})
};

export const enable2FASchema = {
  body: z.object({
    code: z.string({ required_error: msg('TOTP code required', 'رمز التحقق مطلوب') }).length(6)
  })
};

export const disable2FASchema = {
  body: z.object({ code: z.string().length(6).optional(), password: z.string().optional() })
    .refine((data) => !!data.code || !!data.password, msg('Provide TOTP code or password', 'قدم رمز التحقق أو كلمة المرور'))
};

export const regenerateBackupCodesSchema = { body: z.object({}) };

export const requestEmailUpdateSchema = {
  body: z.object({
    newEmail: z.string({ required_error: msg('New email is required', 'البريد الإلكتروني الجديد مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح'))
  })
};

export const verifyEmailQuerySchema = {
  query: z.object({ token: z.string({ required_error: msg('token is required', 'الرمز مطلوب') }).min(20) })
};

// Email 2FA settings
export const requestEmail2FASetupSchema = { body: z.object({}) };
export const enableEmail2FASchema = { body: z.object({ code: z.string({ required_error: msg('Code required', 'الرمز مطلوب') }).length(6) }) };
export const disableEmail2FASchema = {
  body: z
    .object({ code: z.string().length(6).optional(), password: z.string().optional() })
    .refine((data) => !!data.code || !!data.password, msg('Provide code or password', 'قدم الرمز أو كلمة المرور'))
};

// Signup verification + resend
export const resendVerificationSchema = {
  body: z.object({
    email: z.string({ required_error: msg('Email is required', 'البريد الإلكتروني مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح'))
  })
};

export const verifySignupQuerySchema = {
  query: z.object({ token: z.string({ required_error: msg('token is required', 'الرمز مطلوب') }).min(20) })
};

export const verifyEmailOTPSchema = {
  body: z.object({
    email: z.string({ required_error: msg('Email is required', 'البريد الإلكتروني مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح')),
    otp: z.string({ required_error: msg('OTP code is required', 'رمز التحقق مطلوب') }).length(6, msg('OTP must be 6 digits', 'يجب أن يكون رمز التحقق 6 أرقام'))
  })
};

// Password reset
export const forgotPasswordSchema = {
  body: z.object({
    email: z.string({ required_error: msg('Email is required', 'البريد الإلكتروني مطلوب') }).email(msg('Invalid email', 'بريد إلكتروني غير صالح'))
  })
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string({ required_error: msg('Token is required', 'الرمز مطلوب') }).min(20),
    newPassword: z.string({ required_error: msg('newPassword is required', 'كلمة المرور الجديدة مطلوبة') }).min(8, msg('Min 8 characters', 'ثمانية أحرف على الأقل'))
  })
};

export const googleSignInSchema = {
  body: z.object({
    idToken: z.string({ required_error: msg('Google ID token is required', 'رمز Google مطلوب') }).min(1)
  })
};

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  register,
  login,
  refresh,
  logout,
  updatePassword,
  twoFASetup,
  enable2FA,
  disable2FA,
  requestEmailUpdate,
  verifyEmailUpdate,
  resendVerification,
  verifySignup,
  verifyEmailOTP,
  forgotPassword,
  resetPassword,
  requestEmail2FASetup,
  enableEmail2FA,
  disableEmail2FA,
  googleSignIn,
  getSessions,
  revokeSession
} from '../controllers/auth.controller';
import { registerSchema, loginSchema, refreshSchema, updatePasswordSchema, enable2FASchema, disable2FASchema, requestEmailUpdateSchema, verifyEmailQuerySchema, resendVerificationSchema, verifySignupQuerySchema, verifyEmailOTPSchema, forgotPasswordSchema, resetPasswordSchema, requestEmail2FASetupSchema, enableEmail2FASchema, disableEmail2FASchema, googleSignInSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleSignInSchema), googleSignIn);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.post('/password', requireAuth, validate(updatePasswordSchema), updatePassword);

// Signup verification
router.post('/resend-verification', validate(resendVerificationSchema), resendVerification);
router.post('/verify-email-otp', validate(verifyEmailOTPSchema), verifyEmailOTP);
router.get('/verify-signup', validate(verifySignupQuerySchema), verifySignup);

// Forgot/Reset password
router.post('/forgot', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset', validate(resetPasswordSchema), resetPassword);

router.post('/2fa/setup', requireAuth, twoFASetup);
router.post('/2fa/enable', requireAuth, validate(enable2FASchema), enable2FA);
router.post('/2fa/disable', requireAuth, validate(disable2FASchema), disable2FA);

router.post('/email/update-request', requireAuth, validate(requestEmailUpdateSchema), requestEmailUpdate);
router.get('/email/verify', validate(verifyEmailQuerySchema), verifyEmailUpdate);

// Email 2FA
router.post('/email-2fa/request', requireAuth, validate(requestEmail2FASetupSchema), requestEmail2FASetup);
router.post('/email-2fa/enable', requireAuth, validate(enableEmail2FASchema), enableEmail2FA);
router.post('/email-2fa/disable', requireAuth, validate(disableEmail2FASchema), disableEmail2FA);

// Sessions
router.get('/sessions', requireAuth, getSessions);
router.delete('/sessions/:sessionId', requireAuth, revokeSession);

export default router;

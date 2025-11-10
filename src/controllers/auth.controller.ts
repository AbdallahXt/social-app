import { Request, Response } from 'express';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { Session } from '../models/Session';
import { signAccessToken, signRefreshToken, generateJti, verifyRefreshToken } from '../utils/tokens';
import { hashPassword, comparePassword } from '../utils/passwords';
import { sendEmail } from '../services/email';
import { env } from '../config/env';
import { parseDurationToMs, addMs } from '../utils/time';

function genBackupCodes(n = 10) {
  const codes: string[] = [];
  for (let i = 0; i < n; i++) {
    codes.push(crypto.randomBytes(5).toString('hex')); // 10 chars hex
  }
  return codes;
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    
    const passwordHash = await hashPassword(password);
    const tokenPlain = crypto.randomBytes(24).toString('hex');
    const tokenHash = await bcrypt.hash(tokenPlain, 10);
    
    // Generate OTP code (6 digits)
    const otpCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    const otpCodeHash = await bcrypt.hash(otpCode, 10);
    
    const user = await User.create({
      email,
      passwordHash,
      name,
      emailVerified: false,
      emailVerifyToken: tokenHash,
      emailVerifyExpires: addMs(new Date(), 1000 * 60 * 60 * 24),
      emailVerifyOTPCodeHash: otpCodeHash,
      emailVerifyOTPExpires: addMs(new Date(), 1000 * 60 * 10) // 10 minutes
    });
    
    // Generate tokens FIRST (before email) to ensure they're always created
    const jti = generateJti();
    const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, email: user.email }, jti);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const hashedAccessToken = await bcrypt.hash(accessToken, 10);
    const refreshExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtRefreshExpiresIn));
    const accessExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtAccessExpiresIn));
    
    try {
      await RefreshToken.create({ user: user._id, jti, hashedToken: hashedRefreshToken, expiresAt: refreshExpiresAt, revoked: false });
    } catch (tokenError) {
      console.error('Failed to create refresh token:', tokenError);
      // Delete user if token creation fails to avoid orphaned records
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ error: 'Failed to create session' });
    }
    
    // Save session data with both tokens (non-critical, continue if fails)
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      await Session.create({
        user: user._id,
        authMethod: 'password',
        accessToken: hashedAccessToken,
        refreshTokenJti: jti,
        expiresAt: accessExpiresAt,
        deviceInfo: {
          userAgent,
          ipAddress: ipAddress.toString()
        },
        isActive: true,
        lastActivity: new Date(),
        loginAttempt: {
          success: true,
          timestamp: new Date()
        }
      });
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
      // Continue anyway - session is not critical for registration
    }
    
    // Send OTP code via email (non-blocking - don't fail registration if email fails)
    try {
      await sendEmail({ 
        to: email, 
        subject: 'Verify your email - OTP Code', 
        template: 'email-2fa-code', 
        context: { code: otpCode }, 
        tags: ['signup', 'otp'] 
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails - user can resend OTP
    }
    
    // Reload user to get createdAt
    const userWithTimestamps = await User.findById(user._id);
    
    return res.status(201).json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        emailVerified: user.emailVerified,
        createdAt: userWithTimestamps?.createdAt || user.createdAt
      },
      tokens: { accessToken, refreshToken },
      status: 'verify_email_sent',
      message: 'OTP code sent to your email'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    // If response already sent, don't send again
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Registration failed' });
    }
  }
}

export async function login(req: Request, res: Response) {
  const { email, password, totp, backupCode, emailCode } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  // Check if user has a password (not a Google OAuth-only user)
  if (!user.passwordHash) {
    return res.status(401).json({ error: 'Please sign in with Google' });
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  if (!user.emailVerified) {
    return res.status(401).json({ error: 'Email not verified', need_verification: true });
  }

  // 2FA checks: accept either TOTP/backup (if enabled) or email code (if enabled)
  if (user.is2FAEnabled || user.email2FAEnabled) {
    let verified = false;
    if (user.is2FAEnabled) {
      if (totp && user.totpSecret) {
        verified = authenticator.verify({ token: totp, secret: user.totpSecret });
      } else if (backupCode && user.backupCodes?.length) {
        for (const hash of user.backupCodes) {
          if (await bcrypt.compare(backupCode, hash)) {
            verified = true;
            // consume code
            user.backupCodes = user.backupCodes.filter((h) => h !== hash);
            await user.save();
            break;
          }
        }
      }
    }
    if (!verified && user.email2FAEnabled) {
      if (emailCode && user.email2FACodeHash && user.email2FAExpires && user.email2FAExpires > new Date()) {
        const okc = await bcrypt.compare(emailCode, user.email2FACodeHash);
        if (okc) {
          verified = true;
          user.email2FACodeHash = undefined;
          user.email2FAExpires = undefined;
          await user.save();
        }
      }
      if (!verified) {
        // generate and send a fresh code
        const code = (Math.floor(100000 + Math.random() * 900000)).toString();
        user.email2FACodeHash = await bcrypt.hash(code, 10);
        user.email2FAExpires = addMs(new Date(), 1000 * 60 * 10);
        await user.save();
        await sendEmail({ to: user.email, subject: 'Your verification code', template: 'email-2fa-code', context: { code }, tags: ['2fa', 'login'] });
        return res.status(401).json({ error: '2FA required', code_sent: true });
      }
    }
  }

  const jti = generateJti();
  const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ id: user.id, role: user.role, email: user.email }, jti);
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  const hashedAccessToken = await bcrypt.hash(accessToken, 10);
  const refreshExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtRefreshExpiresIn));
  const accessExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtAccessExpiresIn));
  await RefreshToken.create({ user: user._id, jti, hashedToken: hashedRefreshToken, expiresAt: refreshExpiresAt, revoked: false });
  
  // Save session data with both tokens
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  await Session.create({
    user: user._id,
    authMethod: 'password',
    accessToken: hashedAccessToken, // Store hashed access token
    refreshTokenJti: jti,
    expiresAt: accessExpiresAt, // Access token expiration
    deviceInfo: {
      userAgent,
      ipAddress: ipAddress.toString()
    },
    isActive: true,
    lastActivity: new Date(),
    loginAttempt: {
      success: true,
      timestamp: new Date()
    }
  });
  
  return res.json({ user: { id: user.id, email: user.email, name: user.name }, tokens: { accessToken, refreshToken } });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string };
  let payload: any;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  const record = await RefreshToken.findOne({ user: payload.sub, jti: payload.jti });
  if (!record || record.revoked) return res.status(401).json({ error: 'Invalid refresh token' });
  const match = await bcrypt.compare(refreshToken, record.hashedToken);
  if (!match) return res.status(401).json({ error: 'Invalid refresh token' });

  // rotate
  record.revoked = true;
  await record.save();

  const user = await User.findById(payload.sub);
  if (!user) return res.status(401).json({ error: 'Invalid refresh token' });

  const jti = generateJti();
  const newAccess = signAccessToken({ id: user.id, role: user.role, email: user.email });
  const newRefresh = signRefreshToken({ id: user.id, role: user.role, email: user.email }, jti);
  const hashedRefreshToken = await bcrypt.hash(newRefresh, 10);
  const hashedAccessToken = await bcrypt.hash(newAccess, 10);
  const refreshExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtRefreshExpiresIn));
  const accessExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtAccessExpiresIn));
  await RefreshToken.create({ user: user._id, jti, hashedToken: hashedRefreshToken, expiresAt: refreshExpiresAt, revoked: false });

  // Update session with new tokens and update last activity
  await Session.updateMany(
    { user: user._id, refreshTokenJti: payload.jti, isActive: true },
    { 
      accessToken: hashedAccessToken,
      refreshTokenJti: jti, 
      expiresAt: accessExpiresAt,
      lastActivity: new Date() 
    }
  );

  return res.json({ tokens: { accessToken: newAccess, refreshToken: newRefresh } });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as { refreshToken: string };
  try {
    const payload: any = verifyRefreshToken(refreshToken);
    const rec = await RefreshToken.findOne({ user: payload.sub, jti: payload.jti });
    if (rec) {
      rec.revoked = true;
      await rec.save();
      
      // Deactivate session
      await Session.updateMany(
        { user: payload.sub, refreshTokenJti: payload.jti, isActive: true },
        { isActive: false, lastActivity: new Date() }
      );
    }
  } catch {}
  return res.json({ status: 'ok' });
}

export async function updatePassword(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  // Check if user has a password to update
  if (!user.passwordHash) {
    return res.status(400).json({ error: 'Cannot update password for Google OAuth accounts. Set a password first.' });
  }
  const { oldPassword, newPassword } = req.body;
  const ok = await comparePassword(oldPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Old password incorrect' });
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return res.json({ status: 'ok' });
}

export async function twoFASetup(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const secret = authenticator.generateSecret();
  user.totpSecret = secret;
  await user.save();
  const label = encodeURIComponent(`SocialApp:${user.email}`);
  const otpauth = authenticator.keyuri(label, 'SocialApp', secret);
  return res.json({ secret, otpauth });
}

export async function enable2FA(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user || !user.totpSecret) return res.status(400).json({ error: 'Setup TOTP first' });
  const { code } = req.body;
  const ok = authenticator.verify({ token: code, secret: user.totpSecret });
  if (!ok) return res.status(400).json({ error: 'Invalid code' });
  user.is2FAEnabled = true;
  const plainCodes = genBackupCodes();
  user.backupCodes = await Promise.all(plainCodes.map((c) => bcrypt.hash(c, 10)));
  await user.save();
  return res.json({ backupCodes: plainCodes });
}

export async function disable2FA(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { code, password } = req.body || {};
  let verified = false;
  if (password) {
    verified = await comparePassword(password, user.passwordHash);
  } else if (code && user.totpSecret) {
    verified = authenticator.verify({ token: code, secret: user.totpSecret });
  }
  if (!verified) return res.status(400).json({ error: 'Verification failed' });
  user.is2FAEnabled = false;
  user.totpSecret = undefined;
  user.backupCodes = [];
  await user.save();
  return res.json({ status: 'ok' });
}

export async function regenerateBackupCodes(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user || !user.is2FAEnabled) return res.status(400).json({ error: '2FA not enabled' });
  const plain = genBackupCodes();
  user.backupCodes = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)));
  await user.save();
  return res.json({ backupCodes: plain });
}

export async function requestEmailUpdate(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { newEmail } = req.body as { newEmail: string };
  const exists = await User.findOne({ email: newEmail });
  if (exists) return res.status(409).json({ error: 'Email already used' });
  const tokenPlain = crypto.randomBytes(24).toString('hex');
  const tokenHash = await bcrypt.hash(tokenPlain, 10);
  user.emailChangeToken = tokenHash;
  user.emailChangeNewEmail = newEmail;
  user.emailChangeExpires = addMs(new Date(), 1000 * 60 * 60 * 24); // 24h
  await user.save();
  const verifyUrl = `${env.clientUrl}/verify-email?token=${tokenPlain}`;
  await sendEmail({ to: newEmail, subject: 'Verify your new email', template: 'verify-email', context: { verifyUrl }, tags: ['email-update'] });
  return res.json({ status: 'sent' });
}

export async function verifyEmailUpdate(req: Request, res: Response) {
  const tokenPlain = (req.query.token as string) || '';
  const users = await User.find({ emailChangeToken: { $exists: true }, emailChangeExpires: { $gt: new Date() } });
  for (const user of users) {
    if (user.emailChangeToken && (await bcrypt.compare(tokenPlain, user.emailChangeToken))) {
      if (!user.emailChangeNewEmail) return res.status(400).json({ error: 'Invalid request' });
      user.email = user.emailChangeNewEmail;
      user.emailVerified = true;
      user.emailChangeToken = undefined;
      user.emailChangeNewEmail = undefined;
      user.emailChangeExpires = undefined;
      await user.save();
      return res.json({ status: 'verified' });
    }
  }
  return res.status(400).json({ error: 'Invalid or expired token' });
}

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email } = req.body as { email: string };
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ status: 'sent', message: 'If the email exists, an OTP code has been sent' });
    }
    
    if (user.emailVerified) {
      return res.status(200).json({ status: 'already_verified', message: 'Email is already verified' });
    }
    
    // Generate new OTP code (6 digits)
    const otpCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    const otpCodeHash = await bcrypt.hash(otpCode, 10);
    
    user.emailVerifyOTPCodeHash = otpCodeHash;
    user.emailVerifyOTPExpires = addMs(new Date(), 1000 * 60 * 10); // 10 minutes
    
    // Also keep token for backward compatibility
    const tokenPlain = crypto.randomBytes(24).toString('hex');
    user.emailVerifyToken = await bcrypt.hash(tokenPlain, 10);
    user.emailVerifyExpires = addMs(new Date(), 1000 * 60 * 60 * 24);
    
    await user.save();
    
    // Send OTP code via email (non-blocking)
    try {
      await sendEmail({ 
        to: user.email, 
        subject: 'Verify your email - OTP Code', 
        template: 'email-2fa-code', 
        context: { code: otpCode }, 
        tags: ['signup-resend', 'otp'] 
      });
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      // Still return success to not reveal email issues
    }
    
    return res.json({ status: 'sent', message: 'OTP code sent to your email' });
  } catch (error: any) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to resend verification code' });
  }
}

export async function verifyEmailOTP(req: Request, res: Response) {
  try {
    const { email, otp } = req.body as { email: string; otp: string };
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }
    
    // Check if OTP exists and is not expired
    if (!user.emailVerifyOTPCodeHash || !user.emailVerifyOTPExpires) {
      return res.status(400).json({ error: 'No OTP code found. Please request a new one.' });
    }
    
    if (user.emailVerifyOTPExpires <= new Date()) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }
    
    // Verify OTP code
    const isValid = await bcrypt.compare(otp, user.emailVerifyOTPCodeHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }
    
    // Mark email as verified
    user.emailVerified = true;
    user.emailVerifyOTPCodeHash = undefined;
    user.emailVerifyOTPExpires = undefined;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();
    
    return res.json({ 
      status: 'verified', 
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified
      }
    });
  } catch (error: any) {
    console.error('Verify email OTP error:', error);
    return res.status(500).json({ error: error.message || 'Verification failed' });
  }
}

export async function verifySignup(req: Request, res: Response) {
  const tokenPlain = (req.query.token as string) || '';
  const users = await User.find({ emailVerifyToken: { $exists: true }, emailVerifyExpires: { $gt: new Date() } });
  for (const user of users) {
    if (user.emailVerifyToken && (await bcrypt.compare(tokenPlain, user.emailVerifyToken))) {
      user.emailVerified = true;
      user.emailVerifyToken = undefined;
      user.emailVerifyExpires = undefined;
      await user.save();
      return res.json({ status: 'verified' });
    }
  }
  return res.status(400).json({ error: 'Invalid or expired token' });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });
  if (user) {
    const tokenPlain = crypto.randomBytes(24).toString('hex');
    user.resetPasswordToken = await bcrypt.hash(tokenPlain, 10);
    user.resetPasswordExpires = addMs(new Date(), 1000 * 60 * 30); // 30m
    await user.save();
    const resetUrl = `${env.clientUrl}/reset-password?token=${tokenPlain}`;
    await sendEmail({ to: email, subject: 'Reset your password', template: 'password-reset', context: { resetUrl }, tags: ['password-reset'] });
  }
  return res.json({ status: 'sent' });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const users = await User.find({ resetPasswordToken: { $exists: true }, resetPasswordExpires: { $gt: new Date() } });
  for (const user of users) {
    if (user.resetPasswordToken && (await bcrypt.compare(token, user.resetPasswordToken))) {
      user.passwordHash = await hashPassword(newPassword);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      return res.json({ status: 'reset' });
    }
  }
  return res.status(400).json({ error: 'Invalid or expired token' });
}

export async function requestEmail2FASetup(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  user.email2FACodeHash = await bcrypt.hash(code, 10);
  user.email2FAExpires = addMs(new Date(), 1000 * 60 * 10); // 10 minutes
  await user.save();
  await sendEmail({ to: user.email, subject: 'Your verification code', template: 'email-2fa-code', context: { code }, tags: ['2fa', 'email'] });
  return res.json({ status: 'sent' });
}

export async function enableEmail2FA(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { code } = req.body as { code: string };
  if (!user.email2FACodeHash || !user.email2FAExpires || user.email2FAExpires <= new Date())
    return res.status(400).json({ error: 'Code expired' });
  const ok = await bcrypt.compare(code, user.email2FACodeHash);
  if (!ok) return res.status(400).json({ error: 'Invalid code' });
  user.email2FAEnabled = true;
  user.email2FACodeHash = undefined;
  user.email2FAExpires = undefined;
  await user.save();
  return res.json({ status: 'enabled' });
}

export async function disableEmail2FA(req: Request, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  const { code, password } = req.body as { code?: string; password?: string };
  let verified = false;
  if (password && user.passwordHash) verified = await comparePassword(password, user.passwordHash);
  else if (code && user.email2FACodeHash && user.email2FAExpires && user.email2FAExpires > new Date()) verified = await bcrypt.compare(code, user.email2FACodeHash);
  if (!verified) return res.status(400).json({ error: 'Verification failed' });
  user.email2FAEnabled = false;
  user.email2FACodeHash = undefined;
  user.email2FAExpires = undefined;
  await user.save();
  return res.json({ status: 'disabled' });
}

export async function getSessions(req: Request, res: Response) {
  const userId = req.user!.id;
  const sessions = await Session.find({ user: userId })
    .sort({ createdAt: -1 })
    .select('-accessToken -oauthData')
    .limit(50);
  return res.json({ sessions });
}

export async function revokeSession(req: Request, res: Response) {
  const userId = req.user!.id;
  const { sessionId } = req.params;
  const session = await Session.findOne({ _id: sessionId, user: userId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.isActive = false;
  await session.save();
  
  // Also revoke the associated refresh token if exists
  if (session.refreshTokenJti) {
    const refreshToken = await RefreshToken.findOne({ user: userId, jti: session.refreshTokenJti });
    if (refreshToken) {
      refreshToken.revoked = true;
      await refreshToken.save();
    }
  }
  
  return res.json({ status: 'ok' });
}

export async function googleSignIn(req: Request, res: Response) {
  const { idToken } = req.body as { idToken: string };

  if (!env.google.clientId) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }

  const client = new OAuth2Client(env.google.clientId);

  try {
    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: env.google.clientId
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email || !name || !googleId) {
      return res.status(400).json({ error: 'Missing required information from Google' });
    }

    // Check if user exists by Google ID
    let user = await User.findOne({ googleId });

    // If not found by Google ID, check by email (for account linking)
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      // Update user if they signed in with Google for the first time (linking accounts)
      if (!user.googleId) {
        user.googleId = googleId;
      }
      // Update avatar if provided and different
      if (picture && picture !== user.avatar) {
        user.avatar = picture;
      }
      // Update name if changed
      if (name !== user.name) {
        user.name = name;
      }
      // Mark email as verified if it wasn't already
      if (!user.emailVerified) {
        user.emailVerified = true;
      }
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        email,
        name,
        avatar: picture,
        googleId,
        emailVerified: true, // Google emails are pre-verified
        role: 'user'
      });
    }

    // Generate tokens (same as regular login)
    const jti = generateJti();
    const accessToken = signAccessToken({ id: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ id: user.id, role: user.role, email: user.email }, jti);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const hashedAccessToken = await bcrypt.hash(accessToken, 10);
    const refreshExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtRefreshExpiresIn));
    const accessExpiresAt = addMs(new Date(), parseDurationToMs(env.jwtAccessExpiresIn));
    await RefreshToken.create({ user: user._id, jti, hashedToken: hashedRefreshToken, expiresAt: refreshExpiresAt, revoked: false });

    // Save session data with OAuth information and both tokens
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    await Session.create({
      user: user._id,
      authMethod: 'google',
      accessToken: hashedAccessToken, // Store hashed access token
      refreshTokenJti: jti,
      expiresAt: accessExpiresAt, // Access token expiration
      oauthProvider: 'google',
      oauthProviderId: googleId,
      oauthData: {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        locale: payload.locale,
        emailVerified: payload.email_verified
      },
      deviceInfo: {
        userAgent,
        ipAddress: ipAddress.toString()
      },
      isActive: true,
      lastActivity: new Date(),
      loginAttempt: {
        success: true,
        timestamp: new Date()
      }
    });

    return res.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    return res.status(401).json({ error: 'Invalid Google token' });
  }
}

import { Request, Response } from 'express';
import { User } from '../models/User';

export async function me(req: Request, res: Response) {
  const user = await User.findById(req.user!.id).select('-passwordHash -totpSecret -backupCodes -emailChangeToken');
  if (!user) return res.status(404).json({ error: 'Not found' });
  return res.json({ user });
}

export async function updateProfile(req: Request, res: Response) {
  const updates = (({
    name,
    avatar,
    bio,
    phone,
    gender,
    location
  }) => ({ name, avatar, bio, phone, gender, location }))(req.body);
  const user = await User.findByIdAndUpdate(req.user!.id, updates, { new: true });
  return res.json({ user });
}

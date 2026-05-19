import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // ── Path 1: Supabase JWT ──────────────────────────────────
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: profile, error: profileError } = await supabase
        .from('dms_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        res.status(403).json({ error: 'User profile not found' });
        return;
      }

      req.user = { id: user.id, email: user.email ?? '', role: profile.role };
      next();
      return;
    }
  } catch {
    // Not a Supabase token — fall through to our own JWT check
  }

  // ── Path 2: Our own JWT (issued for Microsoft SSO users) ──
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
    };

    // Confirm the user still exists in dms_profiles
    const { data: profile, error: profileError } = await supabase
      .from('dms_profiles')
      .select('role')
      .eq('id', decoded.id)
      .single();

    if (profileError || !profile) {
      res.status(403).json({ error: 'User profile not found' });
      return;
    }

    req.user = { id: decoded.id, email: decoded.email, role: profile.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

import { Request, Response, NextFunction } from 'express';
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

  try {
    // Verify the Supabase JWT and get the user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch admin profile + role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('dms_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(403).json({ error: 'User profile not found' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email ?? '',
      role: profile.role,
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token verification failed' });
  }
};

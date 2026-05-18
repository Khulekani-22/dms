import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    res.status(401).json({ error: error?.message ?? 'Login failed' });
    return;
  }

  // Fetch profile/role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', data.user.id)
    .single();

  res.json({
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name ?? '',
      role: profile?.role ?? 'admin',
    },
  });
};

// POST /api/auth/logout
export const logout = async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await supabase.auth.admin.signOut(token);
  }
  res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  // req.user is populated by authMiddleware
  const user = (req as any).user;
  res.json({ user });
};

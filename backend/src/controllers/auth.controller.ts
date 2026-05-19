import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { supabase } from '../lib/supabase';

// Microsoft JWKS client — fetches public keys from Entra
const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
});

function getMicrosoftSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    jwks.getSigningKey(header.kid!, (err, key) => {
      if (err || !key) return reject(err ?? new Error('Signing key not found'));
      resolve(key.getPublicKey());
    });
  });
}

interface MicrosoftIdTokenPayload {
  oid: string;       // Object (user) ID in Azure AD
  email?: string;
  preferred_username?: string;
  name?: string;
  tid: string;       // Tenant ID
}

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
    .from('dms_profiles')
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

// POST /api/auth/microsoft
// Body: { idToken: string }  — Microsoft ID token from MSAL
export const microsoftLogin = async (req: Request, res: Response): Promise<void> => {
  const { idToken } = req.body as { idToken?: string };

  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }

  // 1. Decode header to get kid, then verify signature + claims
  let payload: MicrosoftIdTokenPayload;
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new Error('Cannot decode token');

    const signingKey = await getMicrosoftSigningKey(decoded.header);

    payload = jwt.verify(idToken, signingKey, {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }) as MicrosoftIdTokenPayload;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token verification failed';
    res.status(401).json({ error: `Invalid Microsoft token: ${msg}` });
    return;
  }

  // 2. Extract user info
  const microsoftId = payload.oid;
  const email = (payload.email ?? payload.preferred_username ?? '').toLowerCase();
  const fullName = payload.name ?? email.split('@')[0];

  if (!email) {
    res.status(400).json({ error: 'No email address in Microsoft token' });
    return;
  }

  // 3. Upsert into dms_profiles using microsoft_id as the stable key
  //    We use a deterministic UUID derived from the Microsoft OID so the
  //    same Entra user always maps to the same row.
  const { data: existing } = await supabase
    .from('dms_profiles')
    .select('id, role, full_name')
    .eq('microsoft_id', microsoftId)
    .maybeSingle();

  let userId: string;
  let role: string;

  if (existing) {
    userId = existing.id;
    role = existing.role;
  } else {
    // First login — create a new profile row
    // Generate a UUID v5-style ID from the Microsoft OID (deterministic)
    const crypto = await import('crypto');
    userId = crypto.createHash('sha256').update(microsoftId).digest('hex').replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12}).*/,
      '$1-$2-$3-$4-$5'
    );

    const { error: insertError } = await supabase
      .from('dms_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'admin',
        microsoft_id: microsoftId,
      });

    if (insertError) {
      // Might already exist by email — try to fetch
      const { data: byEmail } = await supabase
        .from('dms_profiles')
        .select('id, role')
        .eq('email', email)
        .maybeSingle();

      if (byEmail) {
        userId = byEmail.id;
        role = byEmail.role;
        // Backfill microsoft_id
        await supabase
          .from('dms_profiles')
          .update({ microsoft_id: microsoftId })
          .eq('id', userId);
      } else {
        res.status(500).json({ error: 'Failed to create user profile' });
        return;
      }
    }

    role = 'admin';
  }

  // 4. Issue our own JWT (same mechanism as PIN sessions but for admin users)
  const token = jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: { id: userId, email, full_name: fullName, role },
  });
};

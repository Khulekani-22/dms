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

  // Diagnose env var presence immediately
  console.log('[microsoftLogin] ENV CHECK:', {
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID ? '✓ set' : '✗ MISSING',
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID ? '✓ set' : '✗ MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? '✓ set' : '✗ MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL ? '✓ set' : '✗ MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set' : '✗ MISSING',
  });

  // 1. Decode header to get kid, then verify signature + claims
  let payload: MicrosoftIdTokenPayload;
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') throw new Error('Cannot decode token');

    console.log('[microsoftLogin] token kid:', decoded.header.kid);
    console.log('[microsoftLogin] token iss:', (decoded.payload as any).iss);
    console.log('[microsoftLogin] token aud:', (decoded.payload as any).aud);

    const signingKey = await getMicrosoftSigningKey(decoded.header);

    payload = jwt.verify(idToken, signingKey, {
      audience: process.env.AZURE_CLIENT_ID!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }) as unknown as MicrosoftIdTokenPayload;

    console.log('[microsoftLogin] token verified ✓ oid:', payload.oid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token verification failed';
    console.error('[microsoftLogin] Token verification FAILED:', msg);
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
    .select('id, role, full_name, email')
    .eq('microsoft_id', microsoftId)
    .maybeSingle();

  let userId: string;
  let role: string;

  if (existing) {
    userId = existing.id;
    role = existing.role ?? 'admin';
    console.log('[microsoftLogin] Existing user found:', userId);
  } else {
    console.log('[microsoftLogin] New user — creating auth.users entry then profile...');

    // Must create a real auth.users row first because dms_profiles.id
    // is a FK to auth.users(id). Use the admin API so no password/email
    // confirmation is required.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, microsoft_id: microsoftId },
    });

    if (authError || !authData?.user) {
      // User might already exist in auth.users (duplicate email) — look them up
      console.warn('[microsoftLogin] createUser error:', authError?.message);

      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      console.log('[microsoftLogin] listUsers error:', listError?.message);

      const existingAuthUser = users?.find((u) => u.email?.toLowerCase() === email);
      if (!existingAuthUser) {
        res.status(500).json({ error: 'Failed to create auth user', detail: authError?.message });
        return;
      }
      userId = existingAuthUser.id;
      console.log('[microsoftLogin] Found existing auth user by email:', userId);
    } else {
      userId = authData.user.id;
      console.log('[microsoftLogin] Created new auth user:', userId);
    }

    // Upsert the profile row (trigger may have already created it)
    const { error: profileError } = await supabase
      .from('dms_profiles')
      .upsert({
        id: userId,
        email,
        full_name: fullName,
        role: 'admin',
        microsoft_id: microsoftId,
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('[microsoftLogin] Profile upsert error:', profileError.message, profileError.details);
      // Non-fatal if row already exists — just update microsoft_id
      await supabase
        .from('dms_profiles')
        .update({ microsoft_id: microsoftId, email, full_name: fullName })
        .eq('id', userId);
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

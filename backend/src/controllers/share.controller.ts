import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authMiddleware';
import jwt from 'jsonwebtoken';

// Generate a random 5-digit PIN not already in use
const generateUniquePin = async (): Promise<string> => {
  let pin: string;
  let isUnique = false;

  do {
    pin = String(Math.floor(10000 + Math.random() * 90000));
    const { data } = await supabase
      .from('share_links')
      .select('id')
      .eq('pin', pin)
      .eq('is_active', true)
      .maybeSingle();
    isUnique = !data;
  } while (!isUnique);

  return pin;
};

// GET /api/share  (admin — list all share links)
export const getShareLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  const { folder_id } = req.query;

  let query = supabase
    .from('share_links')
    .select(`
      id, pin, expires_at, max_uses, use_count, is_active, created_at,
      folders:folder_id (id, name),
      profiles:created_by (full_name)
    `)
    .order('created_at', { ascending: false });

  if (folder_id) {
    query = query.eq('folder_id', folder_id as string);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ share_links: data });
};

// POST /api/share  (admin — generate PIN for a folder)
export const createShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { folder_id, expires_at, max_uses } = req.body;

  if (!folder_id) {
    res.status(400).json({ error: 'folder_id is required' });
    return;
  }

  // Verify folder exists
  const { data: folder, error: folderError } = await supabase
    .from('folders')
    .select('id, name')
    .eq('id', folder_id)
    .single();

  if (folderError || !folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const pin = await generateUniquePin();

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      folder_id,
      pin,
      created_by: req.user!.id,
      expires_at: expires_at ?? null,
      max_uses: max_uses ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const shareUrl = `${process.env.FRONTEND_URL}/access/${pin}`;

  res.status(201).json({
    share_link: data,
    pin,
    url: shareUrl,
    folder: folder,
  });
};

// PATCH /api/share/:id  (admin — update expiry or deactivate)
export const updateShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { expires_at, max_uses, is_active } = req.body;

  const updates: Record<string, unknown> = {};
  if (expires_at !== undefined) updates.expires_at = expires_at;
  if (max_uses !== undefined) updates.max_uses = max_uses;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('share_links')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ share_link: data });
};

// DELETE /api/share/:id  (admin — revoke)
export const deleteShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Share link revoked successfully' });
};

// POST /api/access/validate  (public — validate PIN and return JWT session)
export const validatePin = async (req: Request, res: Response): Promise<void> => {
  const { pin } = req.body;

  if (!pin || String(pin).length !== 5) {
    res.status(400).json({ error: 'A valid 5-digit PIN is required' });
    return;
  }

  const { data: link, error } = await supabase
    .from('share_links')
    .select(`
      id, pin, folder_id, expires_at, max_uses, use_count, is_active,
      folders:folder_id (id, name, description)
    `)
    .eq('pin', String(pin))
    .eq('is_active', true)
    .single();

  if (error || !link) {
    res.status(404).json({ error: 'Invalid PIN. Please check and try again.' });
    return;
  }

  // Check expiry
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    res.status(403).json({ error: 'This PIN has expired.' });
    return;
  }

  // Check max uses
  if (link.max_uses !== null && link.use_count >= link.max_uses) {
    res.status(403).json({ error: 'This PIN has reached its maximum number of uses.' });
    return;
  }

  // Increment use_count
  await supabase
    .from('share_links')
    .update({ use_count: link.use_count + 1 })
    .eq('id', link.id);

  // Issue a short-lived JWT PIN session token (1 hour)
  const sessionToken = jwt.sign(
    { pin: link.pin, folderId: link.folder_id, shareLinkId: link.id },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  res.json({
    token: sessionToken,
    folder: link.folders,
  });
};

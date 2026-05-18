import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authMiddleware';
import { PinRequest } from '../middleware/pinMiddleware';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Multer — store in memory, then push to Supabase Storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// GET /api/folders/:id/documents  (admin)
export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('documents')
    .select(`
      id, original_name, mime_type, size, storage_path, uploaded_at,
      dms_profiles:uploaded_by (full_name)
    `)
    .eq('folder_id', id)
    .order('uploaded_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ documents: data });
};

// POST /api/documents/upload  (admin)
export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const { folder_id } = req.body;

  if (!folder_id) {
    res.status(400).json({ error: 'folder_id is required' });
    return;
  }

  const files = (req as any).files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'No files provided' });
    return;
  }

  const uploaded: object[] = [];
  const failed: object[] = [];

  for (const file of files) {
    const ext = path.extname(file.originalname);
    const storagePath = `${folder_id}/${uuidv4()}${ext}`;

    // Upload to Supabase Storage bucket "documents"
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (storageError) {
      failed.push({ name: file.originalname, error: storageError.message });
      continue;
    }

    // Save metadata to DB
    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        folder_id,
        filename: storagePath,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        storage_path: storagePath,
        uploaded_by: req.user!.id,
      })
      .select()
      .single();

    if (dbError) {
      failed.push({ name: file.originalname, error: dbError.message });
    } else {
      uploaded.push(doc);
    }
  }

  res.status(201).json({ uploaded, failed });
};

// GET /api/documents/:id/download  (admin)
export const downloadDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data: doc, error } = await supabase
    .from('documents')
    .select('storage_path, original_name')
    .eq('id', id)
    .single();

  if (error || !doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 300); // 5 min expiry

  if (urlError || !signedUrl) {
    res.status(500).json({ error: 'Failed to generate download URL' });
    return;
  }

  res.json({ url: signedUrl.signedUrl, filename: doc.original_name });
};

// DELETE /api/documents/:id  (admin)
export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError || !doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  await supabase.storage.from('documents').remove([doc.storage_path]);

  const { error } = await supabase.from('documents').delete().eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Document deleted successfully' });
};

// GET /api/access/:pin/documents  (PIN user)
export const getDocumentsByPin = async (req: PinRequest, res: Response): Promise<void> => {
  const folderId = req.pinSession!.folderId;
  const shareLinkId = req.pinSession!.shareLinkId;
  const ip = req.ip ?? 'unknown';
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  const { data, error } = await supabase
    .from('documents')
    .select('id, original_name, mime_type, size, uploaded_at')
    .eq('folder_id', folderId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Log access
  await supabase.from('access_logs').insert({
    share_link_id: shareLinkId,
    ip_address: ip,
    user_agent: userAgent,
    action: 'view',
  });

  res.json({ documents: data });
};

// GET /api/access/:pin/download/:docId  (PIN user)
export const downloadDocumentByPin = async (req: PinRequest, res: Response): Promise<void> => {
  const { docId } = req.params;
  const shareLinkId = req.pinSession!.shareLinkId;
  const folderId = req.pinSession!.folderId;
  const ip = req.ip ?? 'unknown';
  const userAgent = req.headers['user-agent'] ?? 'unknown';

  const { data: doc, error } = await supabase
    .from('documents')
    .select('storage_path, original_name, folder_id')
    .eq('id', docId)
    .single();

  if (error || !doc || doc.folder_id !== folderId) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const { data: signedUrl, error: urlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, 300);

  if (urlError || !signedUrl) {
    res.status(500).json({ error: 'Failed to generate download URL' });
    return;
  }

  // Log download
  await supabase.from('access_logs').insert({
    share_link_id: shareLinkId,
    ip_address: ip,
    user_agent: userAgent,
    action: 'download',
  });

  res.json({ url: signedUrl.signedUrl, filename: doc.original_name });
};

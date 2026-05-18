import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/folders
export const getFolders = async (req: AuthRequest, res: Response): Promise<void> => {
  const parentId = req.query.parent_id as string | undefined;

  let query = supabase
    .from('folders')
    .select(`
      id, name, description, parent_id, created_at,
      profiles:created_by (full_name)
    `)
    .order('name');

  if (parentId) {
    query = query.eq('parent_id', parentId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ folders: data });
};

// GET /api/folders/:id
export const getFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  const { data: folder, error } = await supabase
    .from('folders')
    .select(`
      id, name, description, parent_id, created_at,
      profiles:created_by (full_name)
    `)
    .eq('id', id)
    .single();

  if (error || !folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  // Get sub-folders
  const { data: children } = await supabase
    .from('folders')
    .select('id, name, description, created_at')
    .eq('parent_id', id)
    .order('name');

  // Get document count
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('folder_id', id);

  res.json({ folder: { ...folder, children: children ?? [], document_count: count ?? 0 } });
};

// POST /api/folders
export const createFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, parent_id } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Folder name is required' });
    return;
  }

  const { data, error } = await supabase
    .from('folders')
    .insert({
      name: name.trim(),
      description: description?.trim() ?? null,
      parent_id: parent_id ?? null,
      created_by: req.user!.id,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ folder: data });
};

// PATCH /api/folders/:id
export const updateFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, description } = req.body;

  const updates: Record<string, string> = {};
  if (name?.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description;

  const { data, error } = await supabase
    .from('folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ folder: data });
};

// DELETE /api/folders/:id
export const deleteFolder = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  // Fetch all documents in this folder (and sub-folders via cascade) to remove from storage
  const { data: docs } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('folder_id', id);

  if (docs && docs.length > 0) {
    const paths = docs.map((d) => d.storage_path);
    await supabase.storage.from('documents').remove(paths);
  }

  const { error } = await supabase.from('folders').delete().eq('id', id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ message: 'Folder deleted successfully' });
};

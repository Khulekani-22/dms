import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/logs  (admin)
export const getLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { share_link_id, action, limit = '50', offset = '0' } = req.query as Record<string, string>;

  let query = supabase
    .from('access_logs')
    .select(`
      id, accessed_at, ip_address, user_agent, action,
      share_links:share_link_id (
        pin,
        folders:folder_id (name)
      )
    `, { count: 'exact' })
    .order('accessed_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (share_link_id) query = query.eq('share_link_id', share_link_id);
  if (action) query = query.eq('action', action);

  const { data, error, count } = await query;

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ logs: data, total: count });
};

// GET /api/logs/export  (admin — CSV download)
export const exportLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  const { data, error } = await supabase
    .from('access_logs')
    .select(`
      id, accessed_at, ip_address, user_agent, action,
      share_links:share_link_id (
        pin,
        folders:folder_id (name)
      )
    `)
    .order('accessed_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = (data ?? []).map((log: any) => ({
    id: log.id,
    accessed_at: log.accessed_at,
    action: log.action,
    pin: log.share_links?.pin ?? '',
    folder: log.share_links?.folders?.name ?? '',
    ip_address: log.ip_address,
    user_agent: log.user_agent,
  }));

  const headers = ['id', 'accessed_at', 'action', 'pin', 'folder', 'ip_address', 'user_agent'];
  const csv = [
    headers.join(','),
    ...rows.map((r: any) =>
      headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="access_logs.csv"');
  res.send(csv);
};

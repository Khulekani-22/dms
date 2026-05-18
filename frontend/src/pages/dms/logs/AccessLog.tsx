import { useEffect, useState } from 'react';
import { logService, AccessLog } from '../../../services/logService';
import { Download, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AccessLogPage = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    try {
      const res = await logService.list({ limit, offset });
      setLogs(res.logs);
      setTotal(res.total ?? 0);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-white">Access Logs</h1>
          <p className="text-sm text-neutral-400 mt-0.5">{total} total events</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 px-3 py-2 rounded-lg text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#1e2d40] transition"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => logService.exportCsv()}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ backgroundColor: '#E85D04' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C44D02'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E85D04'; }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#16202e] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: '#1a1a2e' }}>
            <tr>
              <th className="text-left px-4 py-3 text-neutral-300 font-semibold text-xs">Timestamp</th>
              <th className="text-left px-4 py-3 text-neutral-300 font-semibold text-xs">Action</th>
              <th className="text-left px-4 py-3 text-neutral-300 font-semibold text-xs">PIN</th>
              <th className="text-left px-4 py-3 text-neutral-300 font-semibold text-xs">Folder</th>
              <th className="text-left px-4 py-3 text-neutral-300 font-semibold text-xs">IP Address</th>
              <th className="text-left px-4 py-3">User Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-neutral-700">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  No access logs yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-orange-50/40 dark:hover:bg-[#1e2d40] transition border-b border-neutral-100 dark:border-neutral-800">
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 whitespace-nowrap text-xs font-medium">
                    {format(new Date(log.accessed_at), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                      ${log.action === 'download'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {log.action === 'download' ? <Download size={10} /> : <Eye size={10} />}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: '#E85D04' }}>
                    {log.share_links?.pin ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 text-xs">
                    {log.share_links?.folders?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#E85D04' }}>
                    {log.ip_address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs truncate max-w-xs">
                    {log.user_agent ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm text-neutral-500">
          <span>Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="px-3 py-1.5 rounded-lg border hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-neutral-700 transition"
            >
              Previous
            </button>
            <button
              disabled={offset + limit >= total}
              onClick={() => setOffset(offset + limit)}
              className="px-3 py-1.5 rounded-lg border hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-neutral-700 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessLogPage;

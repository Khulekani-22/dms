import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { documentService, Document } from '../../services/documentService';
import {
  FolderOpen, Download, FileText, Image,
  FileSpreadsheet, FileCode, File, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const getFileIcon = (mime: string | null) => {
  if (!mime) return <File size={18} />;
  if (mime.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
  if (mime.includes('pdf')) return <FileText size={18} className="text-red-500" />;
  if (mime.includes('sheet') || mime.includes('excel')) return <FileSpreadsheet size={18} className="text-green-500" />;
  if (mime.includes('json') || mime.includes('xml')) return <FileCode size={18} className="text-orange-500" />;
  return <FileText size={18} className="text-neutral-400" />;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const SharedFolderView = () => {
  const { pin } = useParams<{ pin: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState('');

  useEffect(() => {
    const pinToken = sessionStorage.getItem('dms_pin_token');
    if (!pinToken) {
      navigate(`/access/${pin}`);
      return;
    }

    const stored = sessionStorage.getItem('dms_pin_folder');
    if (stored) {
      try {
        const f = JSON.parse(stored);
        setFolderName(f.name ?? '');
      } catch { /* ignore */ }
    }

    if (!pin) return;
    setLoading(true);
    documentService.listByPin(pin)
      .then(setDocuments)
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, [pin]);

  const handleDownload = async (doc: Document) => {
    if (!pin) return;
    try {
      const { url, filename } = await documentService.getDownloadUrlByPin(pin, doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.click();
      toast.success(`Downloading ${filename}`);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleLeave = () => {
    sessionStorage.removeItem('dms_pin_token');
    sessionStorage.removeItem('dms_pin_folder');
    navigate('/access');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 to-neutral-800 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <FolderOpen size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">{folderName || 'Shared Folder'}</h1>
              <p className="text-neutral-400 text-xs">PIN: <span className="font-mono font-bold text-primary">{pin}</span></p>
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 text-neutral-400 hover:text-white text-sm transition"
          >
            <LogOut size={16} /> Leave
          </button>
        </div>

        {/* Documents card */}
        <div className="bg-white dark:bg-[#1e2734] rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <FileText size={40} className="mx-auto mb-3 opacity-40" />
              <p>No documents in this folder.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-[#253042] text-neutral-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-3">File</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Size</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50 dark:hover:bg-[#253042] transition group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.mime_type)}
                        <span className="font-medium text-neutral-800 dark:text-white truncate max-w-xs">
                          {doc.original_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-neutral-500 hidden sm:table-cell">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-5 py-4 text-neutral-500 hidden md:table-cell">
                      {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition ml-auto"
                      >
                        <Download size={14} /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-center text-neutral-600 text-xs mt-6">
          {documents.length} document{documents.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
};

export default SharedFolderView;

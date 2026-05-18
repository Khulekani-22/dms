import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { folderService, Folder } from '../../../services/folderService';
import { documentService, Document } from '../../../services/documentService';
import {
  ArrowLeft, FolderOpen, UploadCloud, Download, Trash2,
  FileText, Image, FileSpreadsheet, FileCode, File
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const getFileIcon = (mime: string | null) => {
  if (!mime) return <File size={18} />;
  if (mime.startsWith('image/')) return <Image size={18} className="text-blue-500" />;
  if (mime.includes('pdf')) return <FileText size={18} className="text-red-500" />;
  if (mime.includes('sheet') || mime.includes('excel')) return <FileSpreadsheet size={18} className="text-green-500" />;
  if (mime.includes('json') || mime.includes('xml') || mime.includes('html')) return <FileCode size={18} className="text-orange-500" />;
  return <FileText size={18} className="text-neutral-400" />;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FolderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, docs] = await Promise.all([
        folderService.get(id),
        documentService.listByFolder(id),
      ]);
      setFolder(f);
      setDocuments(docs);
    } catch {
      toast.error('Failed to load folder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleDownload = async (doc: Document) => {
    try {
      const { url, filename } = await documentService.getDownloadUrl(doc.id);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.click();
    } catch {
      toast.error('Failed to get download link');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.original_name}"?`)) return;
    try {
      await documentService.delete(doc.id);
      toast.success('Document deleted');
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      toast.error('Failed to delete document');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div>
      <button
        onClick={() => navigate('/folders')}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary mb-4 transition"
      >
        <ArrowLeft size={16} /> All Folders
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">{folder?.name}</h1>
            {folder?.description && (
              <p className="text-sm text-neutral-500">{folder.description}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => navigate(`/folders/${id}/upload`)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          <UploadCloud size={16} /> Upload Files
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p>No documents yet. Upload your first file.</p>
          <button
            onClick={() => navigate(`/folders/${id}/upload`)}
            className="mt-4 text-primary text-sm hover:underline"
          >
            Upload Files
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#253042] rounded-xl border dark:border-neutral-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-[#1e2734] text-neutral-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Uploaded</th>
                <th className="text-left px-4 py-3">Uploaded By</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-neutral-700">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-neutral-50 dark:hover:bg-[#1e2734] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.mime_type)}
                      <span className="font-medium dark:text-white truncate max-w-xs">{doc.original_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{doc.mime_type ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatBytes(doc.size)}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {format(new Date(doc.uploaded_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {doc.profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-neutral-400 hover:text-primary transition"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="text-neutral-400 hover:text-red-500 transition"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FolderDetail;

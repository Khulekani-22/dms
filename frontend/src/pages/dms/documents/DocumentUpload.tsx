import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { documentService } from '../../../services/documentService';
import { UploadCloud, X, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface FileItem {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

const DocumentUpload = () => {
  const { id: folderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const items: FileItem[] = accepted.map((f) => ({
      file: f,
      status: 'pending',
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!folderId || files.length === 0) return;
    setUploading(true);

    const pending = files.filter((f) => f.status === 'pending');
    setFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
    );

    try {
      const { uploaded, failed } = await documentService.upload(
        folderId,
        pending.map((f) => f.file),
        (pct) => {
          setFiles((prev) =>
            prev.map((f) => (f.status === 'uploading' ? { ...f, progress: pct } : f))
          );
        }
      );

      setFiles((prev) =>
        prev.map((f) => {
          if (f.status !== 'uploading') return f;
          const wasUploaded = uploaded.find(
            (u: any) => u.original_name === f.file.name
          );
          return wasUploaded
            ? { ...f, status: 'done', progress: 100 }
            : { ...f, status: 'error', error: 'Upload failed' };
        })
      );

      toast.success(`${uploaded.length} file(s) uploaded successfully`);
      if ((failed as any[]).length > 0) {
        toast.error(`${(failed as any[]).length} file(s) failed`);
      }
    } catch {
      toast.error('Upload failed');
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'error' } : f))
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(`/folders/${folderId}`)}
        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary mb-6 transition"
      >
        <ArrowLeft size={16} /> Back to Folder
      </button>

      <h1 className="text-2xl font-bold text-neutral-800 dark:text-white mb-6">Upload Documents</h1>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition
          ${isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-primary hover:bg-primary/5'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud size={40} className="mx-auto text-neutral-400 mb-3" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here…</p>
        ) : (
          <>
            <p className="text-neutral-600 dark:text-neutral-300 font-medium">
              Drag & drop files here, or click to browse
            </p>
            <p className="text-xs text-neutral-400 mt-1">Max 50 MB per file</p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((item, idx) => (
            <div key={idx}
              className="flex items-center gap-3 bg-white dark:bg-[#253042] rounded-lg border dark:border-neutral-700 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate dark:text-white">{item.file.name}</p>
                <p className="text-xs text-neutral-400">{formatBytes(item.file.size)}</p>
                {item.status === 'uploading' && (
                  <div className="mt-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {item.status === 'done' && <CheckCircle size={18} className="text-green-500 shrink-0" />}
              {item.status === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
              {item.status === 'pending' && (
                <button onClick={() => removeFile(idx)} className="text-neutral-400 hover:text-red-500 transition shrink-0">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={handleUpload}
          disabled={uploading || files.filter((f) => f.status === 'pending').length === 0}
          className="flex-1 bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : `Upload ${files.filter((f) => f.status === 'pending').length} File(s)`}
        </button>
        {files.some((f) => f.status === 'done') && (
          <button
            onClick={() => navigate(`/folders/${folderId}`)}
            className="px-4 py-2.5 rounded-lg border dark:border-neutral-600 dark:text-white hover:bg-neutral-50 dark:hover:bg-neutral-700 text-sm transition"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;

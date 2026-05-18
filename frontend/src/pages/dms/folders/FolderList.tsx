import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { folderService, Folder } from '../../../services/folderService';
import { FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const FolderList = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await folderService.list();
      setFolders(data);
    } catch {
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await folderService.create({ name: newName.trim(), description: newDesc.trim() });
      toast.success('Folder created');
      setNewName(''); setNewDesc(''); setShowCreate(false);
      load();
    } catch {
      toast.error('Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolder) return;
    try {
      await folderService.update(editFolder.id, { name: editFolder.name, description: editFolder.description ?? '' });
      toast.success('Folder updated');
      setEditFolder(null);
      load();
    } catch {
      toast.error('Failed to update folder');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete folder "${name}" and all its contents? This cannot be undone.`)) return;
    try {
      await folderService.delete(id);
      toast.success('Folder deleted');
      load();
    } catch {
      toast.error('Failed to delete folder');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-white">Folders</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Manage your document folders</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: '#E85D04' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C44D02'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E85D04'; }}
        >
          <FolderPlus size={15} /> New Folder
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e2d40] rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-white">Create New Folder</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                autoFocus required
                placeholder="Folder name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg px-3 py-2.5 text-sm dark:text-white focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: '#E85D04' }}
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg px-3 py-2.5 text-sm dark:text-white focus:outline-none resize-none"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#253042] transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-60 transition"
                  style={{ backgroundColor: '#E85D04' }}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editFolder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#1e2d40] rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-neutral-800 dark:text-white">Edit Folder</h2>
            <form onSubmit={handleUpdate} className="space-y-3">
              <input
                autoFocus required
                value={editFolder.name}
                onChange={(e) => setEditFolder({ ...editFolder, name: e.target.value })}
                className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg px-3 py-2.5 text-sm dark:text-white focus:outline-none"
              />
              <textarea
                value={editFolder.description ?? ''}
                onChange={(e) => setEditFolder({ ...editFolder, description: e.target.value })}
                rows={2}
                className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg px-3 py-2.5 text-sm dark:text-white focus:outline-none resize-none"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setEditFolder(null)}
                  className="px-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#253042] transition">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 text-sm rounded-lg text-white transition"
                  style={{ backgroundColor: '#E85D04' }}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Section label */}
      {!loading && folders.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Folders — Submit new entries
          </p>
        </div>
      )}

      {/* Folder grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-neutral-200 dark:bg-[#1e2d40] animate-pulse" />
          ))}
        </div>
      ) : folders.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No folders yet. Create your first folder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div key={folder.id}
              className="bg-white dark:bg-[#16202e] rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-4 hover:shadow-md transition group">
              {/* Top row: title + Form badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-800 dark:text-white text-base leading-snug">{folder.name}</p>
                  {folder.description && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed line-clamp-2">
                      {folder.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                  style={{ borderColor: '#E85D04', color: '#E85D04' }}>
                  Folder
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/folders/${folder.id}`)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition"
                  style={{ backgroundColor: '#E85D04' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C44D02'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E85D04'; }}
                >
                  <FolderOpen size={14} /> Open
                </button>
                <button
                  onClick={() => navigate(`/share?folder=${folder.id}`)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg border transition"
                  style={{ borderColor: '#E85D04', color: '#E85D04' }}
                  onMouseEnter={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.backgroundColor = '#E85D04'; b.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    const b = e.currentTarget as HTMLButtonElement;
                    b.style.backgroundColor = 'transparent'; b.style.color = '#E85D04';
                  }}
                >
                  Share
                </button>
              </div>

              {/* Doc count + edit/delete */}
              <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3 mt-auto">
                <span className="text-xs text-neutral-400">
                  {folder.document_count ?? 0} document{(folder.document_count ?? 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditFolder(folder)}
                    className="text-neutral-300 hover:text-[#E85D04] transition p-1 rounded">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(folder.id, folder.name)}
                    className="text-neutral-300 hover:text-red-500 transition p-1 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderList;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shareService, ShareLink } from '../../../services/shareService';
import { folderService, Folder } from '../../../services/folderService';
import { Copy, Link2, Trash2, Plus, ShieldOff, ShieldCheck, Mail, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EmailTarget {
  email: string;
  name?: string;
}

const ShareManager = () => {
  const navigate = useNavigate();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLink, setNewLink] = useState({
    folder_id: '',
    expires_at: '',
    max_uses: '',
  });
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState<{ pin: string; url: string; folder: string } | null>(null);

  // ── Email modal state ──────────────────────────────────────
  const [emailModal, setEmailModal] = useState<ShareLink | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailTargets, setEmailTargets] = useState<EmailTarget[]>([]);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, f] = await Promise.all([shareService.list(), folderService.list()]);
      setLinks(l);
      setFolders(f);
    } catch {
      toast.error('Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.folder_id) return;
    setCreating(true);
    try {
      const res = await shareService.create({
        folder_id: newLink.folder_id,
        expires_at: newLink.expires_at || null,
        max_uses: newLink.max_uses ? Number(newLink.max_uses) : null,
      });
      setGenerated({ pin: res.pin, url: res.url, folder: res.folder.name });
      setNewLink({ folder_id: '', expires_at: '', max_uses: '' });
      setShowCreate(false);
      load();
    } catch {
      toast.error('Failed to generate PIN');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this share link?')) return;
    try {
      await shareService.revoke(id);
      toast.success('Share link revoked');
      load();
    } catch {
      toast.error('Failed to revoke');
    }
  };

  const handleToggleActive = async (link: ShareLink) => {
    try {
      await shareService.update(link.id, { is_active: !link.is_active });
      toast.success(link.is_active ? 'Link deactivated' : 'Link activated');
      load();
    } catch {
      toast.error('Failed to update link');
    }
  };

  // ── Parse email input into targets ─────────────────────────
  const parseEmails = (raw: string): EmailTarget[] =>
    raw
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
      .map((email) => ({ email }));

  const addEmailTargets = () => {
    const parsed = parseEmails(emailInput);
    const existing = new Set(emailTargets.map((t) => t.email));
    const fresh = parsed.filter((t) => !existing.has(t.email));
    if (!fresh.length) {
      toast.error('No new valid email addresses found');
      return;
    }
    setEmailTargets((prev) => [...prev, ...fresh]);
    setEmailInput('');
  };

  const removeTarget = (email: string) =>
    setEmailTargets((prev) => prev.filter((t) => t.email !== email));

  const handleSendEmail = async () => {
    if (!emailModal) return;
    if (!emailTargets.length) {
      toast.error('Add at least one email address');
      return;
    }
    setSending(true);
    try {
      const accessUrl = `${window.location.origin}/access`;
      const result = await shareService.sendEmail(emailModal.id, {
        recipients: emailTargets,
        pin: emailModal.pin,
        folderName: emailModal.folders?.name ?? 'Documents',
        accessUrl,
        expiresAt: emailModal.expires_at,
        message: emailMessage.trim() || undefined,
      });
      toast.success(`Email sent to ${result.sent} recipient${result.sent === 1 ? '' : 's'}`);
      setEmailModal(null);
      setEmailTargets([]);
      setEmailInput('');
      setEmailMessage('');
    } catch {
      toast.error('Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-white">Share Links</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Generate and manage PIN access links</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          <Plus size={16} /> Generate PIN
        </button>
      </div>

      {/* Generated PIN success banner */}
      {generated && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-5">
          <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
            ✅ PIN generated for "{generated.folder}"
          </h3>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl font-mono font-bold tracking-widest text-green-700 dark:text-green-300">
              {generated.pin}
            </span>
            <button onClick={() => copyToClipboard(generated.pin, 'PIN')}
              className="text-green-600 hover:text-green-800 transition">
              <Copy size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <Link2 size={14} />
            <span className="truncate font-mono">{generated.url}</span>
            <button onClick={() => copyToClipboard(generated.url, 'Link')}
              className="shrink-0 text-green-600 hover:text-green-800 transition">
              <Copy size={14} />
            </button>
          </div>
          <button onClick={() => setGenerated(null)} className="mt-3 text-xs text-green-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Email modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#253042] rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-neutral-700">
              <div>
                <h2 className="text-base font-semibold dark:text-white flex items-center gap-2">
                  <Mail size={18} className="text-primary" /> Send via Email
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Folder: <strong className="text-primary">{emailModal.folders?.name}</strong>
                  &nbsp;· PIN: <strong className="font-mono tracking-widest">{emailModal.pin}</strong>
                </p>
              </div>
              <button
                onClick={() => { setEmailModal(null); setEmailTargets([]); setEmailInput(''); setEmailMessage(''); }}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Email input row */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">
                  Add recipients
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="email@example.com, another@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmailTargets(); } }}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-[#1e2734] dark:border-neutral-600 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addEmailTargets}
                    className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition">
                    Add
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Separate multiple addresses with commas, spaces, or new lines. Press Enter to add.
                </p>
              </div>

              {/* Tags */}
              {emailTargets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailTargets.map((t) => (
                    <span key={t.email}
                      className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
                      {t.email}
                      <button onClick={() => removeTarget(t.email)} className="hover:text-red-500 transition">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Optional message */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">
                  Personal message <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add a short note to appear in the email…"
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none dark:bg-[#1e2734] dark:border-neutral-600 dark:text-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t dark:border-neutral-700 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {emailTargets.length} recipient{emailTargets.length !== 1 ? 's' : ''} · sent from noreply@22onsloane.co
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEmailModal(null); setEmailTargets([]); setEmailInput(''); setEmailMessage(''); }}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300">
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sending || !emailTargets.length}
                  className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60 transition">
                  <Send size={14} />
                  {sending ? 'Sending…' : `Send to ${emailTargets.length || '…'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#253042] rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Generate Share PIN</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">Folder *</label>
                <select
                  required
                  value={newLink.folder_id}
                  onChange={(e) => setNewLink({ ...newLink, folder_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-[#1e2734] dark:border-neutral-600 dark:text-white"
                >
                  <option value="">Select a folder…</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">Expiry (optional)</label>
                <input
                  type="datetime-local"
                  value={newLink.expires_at}
                  onChange={(e) => setNewLink({ ...newLink, expires_at: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-[#1e2734] dark:border-neutral-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-neutral-300">Max uses (optional)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={newLink.max_uses}
                  onChange={(e) => setNewLink({ ...newLink, max_uses: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-[#1e2734] dark:border-neutral-600 dark:text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded-lg border hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-60">
                  {creating ? 'Generating…' : 'Generate PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Links table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <Link2 size={48} className="mx-auto mb-3 opacity-40" />
          <p>No share links yet. Generate your first PIN.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#253042] rounded-xl border dark:border-neutral-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-[#1e2734] text-neutral-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">PIN</th>
                <th className="text-left px-4 py-3">Folder</th>
                <th className="text-left px-4 py-3">Uses</th>
                <th className="text-left px-4 py-3">Expires</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-neutral-700">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-neutral-50 dark:hover:bg-[#1e2734] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg text-primary tracking-widest">{link.pin}</span>
                      <button onClick={() => copyToClipboard(link.pin, 'PIN')}
                        className="text-neutral-300 hover:text-primary transition">
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 dark:text-neutral-300">
                    <button
                      onClick={() => navigate(`/folders/${link.folders?.id}`)}
                      className="hover:text-primary hover:underline transition"
                    >
                      {link.folders?.name ?? '—'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {link.use_count}{link.max_uses ? ` / ${link.max_uses}` : ''}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {link.expires_at ? format(new Date(link.expires_at), 'dd MMM yyyy HH:mm') : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${link.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700'}`}>
                      {link.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {format(new Date(link.created_at), 'dd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/access/${link.pin}`, 'Link')}
                        className="text-neutral-400 hover:text-primary transition" title="Copy link">
                        <Link2 size={15} />
                      </button>
                      <button
                        onClick={() => { setEmailModal(link); }}
                        className="text-neutral-400 hover:text-primary transition" title="Send via email">
                        <Mail size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`transition ${link.is_active ? 'text-neutral-400 hover:text-orange-500' : 'text-neutral-400 hover:text-green-500'}`}
                        title={link.is_active ? 'Deactivate' : 'Activate'}>
                        {link.is_active ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      </button>
                      <button
                        onClick={() => handleRevoke(link.id)}
                        className="text-neutral-400 hover:text-red-500 transition" title="Delete">
                        <Trash2 size={15} />
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

export default ShareManager;

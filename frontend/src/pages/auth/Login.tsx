import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { msalInstance, msalReady, loginRequest } from '../../lib/msal';

const Login = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [msalLoading, setMsalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/folders');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleMicrosoftLogin = async () => {
    setMsalLoading(true);
    console.log('[MSALFlow] Starting loginRedirect — page will navigate to Microsoft...');
    try {
      await msalReady;
      // Clear any stale interaction locks
      Object.keys(localStorage)
        .filter((k) => k.includes('interaction.status'))
        .forEach((k) => localStorage.removeItem(k));
      await msalInstance.loginRedirect(loginRequest);
      // Page navigates away — code below will not run
    } catch (err: unknown) {
      console.error('[MSALFlow] loginRedirect error:', err);
      const msg = err instanceof Error ? err.message : 'Microsoft sign-in failed';
      toast.error(msg);
      setMsalLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#0f1520] p-4">
      <div className="flex w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#1e2734]">

        {/* ── Left orange panel ── */}
        <div
          className="hidden md:flex flex-col items-center justify-between w-[42%] p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #E85D04 0%, #C44D02 100%)' }}
        >
          {/* Decorative circles */}
          <div className="absolute top-[-60px] left-[-60px] w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute bottom-[-40px] right-[-40px] w-44 h-44 rounded-full bg-white/10" />
          <div className="absolute top-1/2 right-[-30px] w-24 h-24 rounded-full bg-white/10" />

          <div className="relative z-10 flex flex-col items-center text-center mt-8">
            {/* Logo */}
            <div className="mb-6">
              <img src="/logo-22.png" alt="22 On Sloane" className="h-16 w-auto object-contain drop-shadow-lg" />
            </div>
            <h2 className="text-2xl font-bold text-white leading-snug">Document<br />Management</h2>
            <p className="text-orange-100 text-sm mt-3 leading-relaxed max-w-[180px]">
              Securely store, share, and manage your organisation's documents.
            </p>
          </div>

          <p className="relative z-10 text-orange-200 text-xs">DMS © {new Date().getFullYear()}</p>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-12">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-neutral-400 mb-7">Sign in to your account to continue</p>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 mb-5">
              <span className="font-bold">✕</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg pl-9 pr-3 py-2.5 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Password
                </label>
                <a href="#" className="text-xs font-semibold text-[#E85D04] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F0F2F8] dark:bg-[#253042] border-0 rounded-lg pl-9 pr-10 py-2.5 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#E85D04]"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ backgroundColor: '#E85D04' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C44D02'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E85D04'; }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
            <span className="text-xs text-neutral-400 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          </div>

          {/* ── Microsoft SSO button ── */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msalLoading}
            className="w-full flex items-center justify-center gap-3 border border-neutral-300 dark:border-neutral-600 rounded-lg py-2.5 px-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-[#253042] hover:bg-neutral-50 dark:hover:bg-[#1e2734] transition disabled:opacity-60"
          >
            {/* Microsoft logo SVG */}
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            {msalLoading ? 'Redirecting…' : 'Sign in with Microsoft'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

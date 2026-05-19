import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { msalInstance } from '../../lib/msal';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

const MicrosoftCallback = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const finish = async () => {
      try {
        // MSAL initialise must complete before handleRedirectPromise
        await msalInstance.initialize();
        const result = await msalInstance.handleRedirectPromise();

        if (!result) {
          // No redirect result — shouldn't land here normally
          navigate('/auth/login');
          return;
        }

        // Exchange Microsoft ID token for our own DMS JWT
        const res = await authService.loginWithMicrosoft(result.idToken);
        setUser(res.user);
        toast.success(`Welcome, ${res.user.full_name || res.user.email}!`);
        navigate('/folders');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Microsoft sign-in failed';
        setError(msg);
        toast.error(msg);
      }
    };

    finish();
  }, [navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#0f1520] p-4">
        <div className="bg-white dark:bg-[#1e2734] rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-white mb-2">Sign-in failed</h2>
          <p className="text-sm text-neutral-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth/login')}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#E85D04' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#0f1520]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: '#E85D04', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Completing sign-in…</p>
      </div>
    </div>
  );
};

export default MicrosoftCallback;

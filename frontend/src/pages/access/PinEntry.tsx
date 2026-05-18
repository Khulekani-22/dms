import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shareService } from '../../services/shareService';

const PinEntry = () => {
  const { pin: urlPin } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill PIN from URL param
  useEffect(() => {
    if (urlPin && /^\d{5}$/.test(urlPin)) {
      setDigits(urlPin.split(''));
    }
  }, [urlPin]);

  // Auto-submit when all 5 digits are filled
  useEffect(() => {
    if (digits.every((d) => d !== '')) {
      handleValidate(digits.join(''));
    }
  }, [digits]);

  const handleDigitChange = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...digits];
    updated[idx] = value.slice(-1);
    setDigits(updated);
    if (value && idx < 4) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (text.length === 5) {
      setDigits(text.split(''));
    }
  };

  const handleValidate = async (pin: string) => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await shareService.validatePin(pin);
      navigate(`/access/${pin}/view`);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error ?? 'Invalid PIN. Please try again.';
      setError(msg);
      setDigits(['', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#0d1523] p-4">
      <div className="flex w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#1a2235]">

        {/* Left orange panel */}
        <div
          className="hidden sm:flex flex-col items-center justify-between w-[42%] p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #E85D04 0%, #C44D02 100%)' }}
        >
          <div className="absolute top-[-60px] left-[-60px] w-56 h-56 rounded-full bg-white/10" />
          <div className="absolute bottom-[-40px] right-[-40px] w-44 h-44 rounded-full bg-white/10" />
          <div className="relative z-10 flex flex-col items-center text-center mt-8">
            <div className="mb-5">
              <img src="/logo-22.png" alt="22 On Sloane" className="h-14 w-auto object-contain drop-shadow-lg" />
            </div>
            <h2 className="text-xl font-bold text-white leading-snug">Secure<br />Document Access</h2>
            <p className="text-orange-100 text-sm mt-3 max-w-[160px] leading-relaxed">
              Enter your PIN to access shared documents.
            </p>
          </div>
          <p className="relative z-10 text-orange-200 text-xs">DMS © {new Date().getFullYear()}</p>
        </div>

        {/* Right form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-white mb-1">Enter Access PIN</h1>
          <p className="text-sm text-neutral-400 mb-8">Enter the 5-digit PIN shared with you</p>

        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition
                dark:bg-[#253042] dark:text-white
                ${error ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                  : digit ? 'border-[#E85D04] bg-orange-50 dark:bg-orange-900/10'
                  : 'border-neutral-200 dark:border-neutral-600'}`}
              style={{ ['--focus-border' as string]: '#E85D04' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E85D04'; }}
              onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.style.borderColor = ''; }}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-500 mb-4">{error}</p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 text-neutral-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style={{ borderColor: '#E85D04', borderTopColor: 'transparent' }} />
            Verifying PIN…
          </div>
        )}

        <p className="text-xs text-neutral-400 mt-6">
          Having trouble? Contact the person who shared this link with you.
        </p>
        </div>
      </div>
    </div>
  );
};

export default PinEntry;

'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await apiFetch('/api/v1/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword: password }) });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(139,43,226,0.2) 0%,transparent 70%)', filter: 'blur(60px)' }} aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 text-center select-none">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>
              <span className="text-white font-black text-sm">U</span>
            </div>
            <span className="text-xl font-black" style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s</span>
            <span className="text-xl font-black text-white">Music</span>
          </div>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)', boxShadow: '0 8px 40px rgba(124,58,237,0.15)' }}>
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-7 h-7"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="text-white font-bold mb-1">Password reset!</p>
              <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>Redirecting to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-1">Reset Password</h1>
              <p className="text-sm mb-6" style={{ color: 'rgba(196,181,212,0.7)' }}>Enter your new password below.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[{ label: 'New Password', value: password, onChange: setPassword }, { label: 'Confirm Password', value: confirm, onChange: setConfirm }].map(({ label, value, onChange }) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>{label}</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" required className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-purple-400/40 outline-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300" aria-label={showPw ? 'Hide' : 'Show'}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
                {error && <p role="alert" className="text-xs text-red-400 text-center bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
                <button type="submit" disabled={loading || !token} className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>
          Remember your password? <Link href="/auth/login" className="text-accent font-semibold hover:text-purple-300">Log In</Link>
        </p>
      </div>
    </div>
  );
}

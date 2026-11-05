'use client';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await apiFetch('/api/v1/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(139,43,226,0.2) 0%,transparent 70%)', filter: 'blur(60px)' }} aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <Link href="/auth/login" className="flex items-center gap-2 text-purple-300/60 hover:text-purple-300 text-sm mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Log In
        </Link>

        <div className="mb-6 text-center select-none">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>
              <span className="text-white font-black text-sm">U</span>
            </div>
            <span className="text-xl font-black" style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s</span>
            <span className="text-xl font-black text-white">Music</span>
          </div>
        </div>

        {sent ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-7 h-7"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>If that email exists, we sent a reset link to <span className="text-accent">{email}</span>.</p>
          </div>
        ) : (
          <div className="rounded-2xl p-7" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)', boxShadow: '0 8px 40px rgba(124,58,237,0.15)' }}>
            <h1 className="text-xl font-bold text-white mb-1">Forgot Password?</h1>
            <p className="text-sm mb-6" style={{ color: 'rgba(196,181,212,0.7)' }}>Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }} onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              {error && <p role="alert" className="text-xs text-red-400 text-center bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-bold text-sm text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

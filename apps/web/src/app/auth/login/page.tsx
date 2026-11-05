'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Music2 } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

interface LoginResponse {
  user: { id: string; email: string; username: string; role: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch<LoginResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrUsername, password }),
      });
      router.push('/home');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0d0121 0%, #130329 50%, #0d0121 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(139,43,226,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center select-none">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>
              <span className="text-white font-black text-base">U</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-black" style={{ background: 'linear-gradient(135deg, #e879f9, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s</span>
              <span className="text-2xl font-black text-white ml-1">Music</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(42,13,74,0.8), rgba(26,5,51,0.9))',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.2), 0 0 0 1px rgba(168,85,247,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <h1 className="text-xl font-bold text-white mb-1">Welcome Back</h1>
          <p className="text-sm text-purple-300/70 mb-6">Log in to your music journey</p>

          <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
            {/* Email or Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-purple-200/80">Email or Username</label>
              <input
                type="text"
                placeholder="you@example.com or username"
                autoComplete="username"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/50 outline-none transition-all"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(168,85,247,0.2)',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-purple-200/80">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-purple-400/50 outline-none transition-all"
                  style={{
                    background: 'rgba(124,58,237,0.1)',
                    border: '1px solid rgba(168,85,247,0.2)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-xs text-accent hover:text-purple-300 transition-colors">
                  Forgot Password?
                </Link>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-400 text-center bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                boxShadow: '0 0 20px rgba(124,58,237,0.4), 0 4px 15px rgba(124,58,237,0.2)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Logging in…
                </span>
              ) : 'Log In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.15)' }} />
            <span className="text-xs text-purple-400/50">or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.15)' }} />
          </div>

          {/* Social buttons */}
          <div className="flex gap-3">
            {[
              { label: 'Google', letter: 'G', color: '#EA4335' },
              { label: 'Apple', letter: '', color: '#ffffff', isApple: true },
              { label: 'Facebook', letter: 'f', color: '#1877F2' },
            ].map(({ label, letter, color, isApple }) => (
              <button
                key={label}
                type="button"
                aria-label={`Continue with ${label}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium text-white transition-all hover:scale-105"
                style={{
                  background: 'rgba(124,58,237,0.1)',
                  border: '1px solid rgba(168,85,247,0.2)',
                }}
              >
                {isApple ? (
                  <Music2 size={14} style={{ color }} aria-hidden="true" />
                ) : (
                  <span style={{ color, fontWeight: 900, fontSize: '14px' }}>{letter}</span>
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-purple-300/60">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-accent font-semibold hover:text-purple-300 transition-colors">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

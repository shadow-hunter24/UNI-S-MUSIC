'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';

interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

function AuthInput({
  label,
  type = 'text',
  placeholder,
  autoComplete,
  value,
  onChange,
  required,
  suffix,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-purple-200/80">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/50 outline-none transition-all"
          style={{
            background: 'rgba(124,58,237,0.1)',
            border: '1px solid rgba(168,85,247,0.2)',
            paddingRight: suffix ? '2.75rem' : undefined,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(168,85,247,0.6)';
            e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(168,85,247,0.2)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function validatePassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter.';
    if (!/\d/.test(pw)) return 'Password must contain a number.';
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const pwError = validatePassword(password);
    if (pwError) { setError(pwError); return; }
    setLoading(true);
    try {
      await apiFetch<unknown>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, fullName } satisfies RegisterPayload),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = {
    background: 'linear-gradient(180deg, #0d0121 0%, #130329 50%, #0d0121 100%)',
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={pageStyle}>
        <div
          className="w-full max-w-sm rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(42,13,74,0.8), rgba(26,5,51,0.9))',
            border: '1px solid rgba(168,85,247,0.25)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.2)',
          }}
        >
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 25px rgba(124,58,237,0.5)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-8 h-8" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-sm text-purple-300/70 mb-6">
            Registration successful! We sent a verification link to <span className="text-accent">{email}</span>.
          </p>
          <Link
            href="/auth/login"
            className="inline-block w-full py-3 rounded-xl font-bold text-sm text-white text-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden" style={pageStyle}>
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(139,43,226,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-6 text-center select-none">
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
          <h1 className="text-xl font-bold text-white mb-1">Create Account</h1>
          <p className="text-sm text-purple-300/70 mb-5">Join Uni&apos;s Music and start your journey</p>

          <form className="flex flex-col gap-3.5" noValidate onSubmit={handleSubmit}>
            <AuthInput
              label="Full Name"
              placeholder="Your name"
              autoComplete="name"
              value={fullName}
              onChange={setFullName}
              required
            />
            <AuthInput
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              required
            />
            <AuthInput
              label="Username"
              placeholder="your_username"
              autoComplete="username"
              value={username}
              onChange={setUsername}
              required
            />
            <AuthInput
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-purple-400/60 hover:text-purple-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <AuthInput
              label="Confirm Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-purple-400/60 hover:text-purple-300 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {error && (
              <p role="alert" className="text-xs text-red-400 text-center bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white mt-1 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
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
                  Creating account…
                </span>
              ) : 'Sign Up'}
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
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                {isApple ? (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white" aria-hidden="true"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                ) : (
                  <span style={{ color, fontWeight: 900, fontSize: '14px' }}>{letter}</span>
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-purple-300/60">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent font-semibold hover:text-purple-300 transition-colors">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiError } from '@/lib/api';

interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      await apiFetch<unknown>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, fullName } satisfies RegisterPayload),
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8 select-none" aria-label="Uni's Music">
            <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
            <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
          </div>
          <div className="bg-bg-elevated rounded-brand p-6">
            <p className="text-white font-semibold mb-2">Check your email</p>
            <p className="text-text-secondary text-sm">
              Registration successful! Check your email to verify your account.
            </p>
          </div>
          <p className="mt-6 text-sm text-text-secondary">
            Already verified?{' '}
            <Link href="/auth/login" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-6 text-center">Create your account</h1>

        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            type="text"
            placeholder="Your name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            aria-required="true"
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-required="true"
          />
          <Input
            label="Username"
            type="text"
            placeholder="your_username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-required="true"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
            helperText="At least 8 characters with uppercase, lowercase, and a number."
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            aria-required="true"
          />

          {error && (
            <p role="alert" className="text-sm text-error text-center">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

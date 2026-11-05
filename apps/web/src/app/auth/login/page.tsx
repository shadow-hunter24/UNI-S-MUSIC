'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiError } from '@/lib/api';

interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
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
      router.push('/');
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

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-6 text-center">Welcome back</h1>

        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
          <Input
            label="Email or Username"
            type="text"
            placeholder="you@example.com or username"
            autoComplete="username"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
            aria-required="true"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-required="true"
          />

          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="text-xs text-text-secondary hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p role="alert" className="text-sm text-error text-center">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
            Log In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}

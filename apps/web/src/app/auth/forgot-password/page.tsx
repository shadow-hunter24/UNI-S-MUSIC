'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch<{ message: string }>('/api/v1/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      // Show generic success regardless to prevent email enumeration
      if (err instanceof ApiError && err.status >= 500) {
        setError('Something went wrong. Please try again later.');
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2 text-center">Reset your password</h1>
        <p className="text-text-secondary text-sm text-center mb-6">
          Enter your email and we&apos;ll send a reset link if the account exists.
        </p>

        {submitted ? (
          <div className="bg-bg-elevated rounded-brand p-6 text-center">
            <p className="text-white font-semibold mb-2">Check your inbox</p>
            <p className="text-text-secondary text-sm">
              If that email is registered, you&apos;ll receive a reset link shortly.
            </p>
          </div>
        ) : (
          <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
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

            {error && (
              <p role="alert" className="text-sm text-error text-center">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
              Send Reset Link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-secondary">
          Remember your password?{' '}
          <Link href="/auth/login" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

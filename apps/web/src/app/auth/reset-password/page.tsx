'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, ApiError } from '@/lib/api';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      await apiFetch<{ message: string }>('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      router.push('/auth/login?reset=true');
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
        <div className="mb-8 text-center select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-2 text-center">Set new password</h1>
        <p className="text-text-secondary text-sm text-center mb-6">
          Choose a strong password for your account.
        </p>

        <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            aria-required="true"
            helperText="At least 8 characters with uppercase, lowercase, and a number."
          />
          <Input
            label="Confirm New Password"
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
            Reset Password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link href="/auth/login" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
            Back to Log In
          </Link>
        </p>
      </div>
    </div>
  );
}

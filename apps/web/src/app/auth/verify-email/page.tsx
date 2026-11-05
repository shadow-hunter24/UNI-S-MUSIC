'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in the URL.');
      return;
    }

    apiFetch<{ message: string }>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Invalid or expired link.');
        }
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8 select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        {status === 'loading' && (
          <div className="bg-bg-elevated rounded-brand p-6">
            <p className="text-text-secondary text-sm">Verifying your email…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-bg-elevated rounded-brand p-6">
            <p className="text-white font-semibold mb-2">Email verified!</p>
            <p className="text-text-secondary text-sm mb-4">
              Your email has been verified. You can now log in.
            </p>
            <Link
              href="/auth/login"
              className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline text-sm"
            >
              Go to Log In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-bg-elevated rounded-brand p-6">
            <p className="text-error font-semibold mb-2">Verification failed</p>
            <p className="text-text-secondary text-sm mb-4">
              {errorMessage || 'Invalid or expired link.'}
            </p>
            <Link
              href="/auth/login"
              className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline text-sm"
            >
              Back to Log In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

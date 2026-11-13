'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mic2, ShieldCheck, CheckCircle } from 'lucide-react';
import { useApplyArtist } from '@/lib/hooks/useArtist';

export default function ArtistApplyPage() {
  const router = useRouter();
  const { mutate: applyArtist, isPending, error, isSuccess } = useApplyArtist();

  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        router.push('/artist/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError('');

    const trimmed = stageName.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      setFieldError('Stage name must be between 2 and 50 characters.');
      return;
    }

    applyArtist({ stageName: trimmed, bio: bio.trim() || undefined });
  }

  const serverError =
    error instanceof Error ? error.message : error ? String(error) : null;

  return (
    <div
      className="min-h-screen flex flex-col pb-10"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{
          background: 'rgba(13,1,33,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(168,85,247,0.15)',
        }}
      >
        <Link
          href="/profile"
          aria-label="Back"
          className="text-purple-300/60 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Become an Artist</h1>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-md mx-auto w-full">

        {/* Hero icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))',
            boxShadow: '0 0 30px rgba(124,58,237,0.4)',
            border: '1px solid rgba(168,85,247,0.4)',
          }}
        >
          <Mic2 size={36} className="text-purple-400" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-1">Artist Application</h2>
          <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>
            Set up your artist profile and start sharing your music.
          </p>
        </div>

        {/* Success state */}
        {isSuccess ? (
          <div
            className="w-full rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
            style={{
              background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.1))',
              border: '1px solid rgba(34,197,94,0.3)',
            }}
          >
            <CheckCircle size={48} className="text-green-400" />
            <div>
              <p className="text-white font-bold text-lg mb-1">Application Submitted!</p>
              <p className="text-sm" style={{ color: 'rgba(196,181,212,0.75)' }}>
                Your account is now an artist account. Get verified by growing your followers and
                publishing tracks.
              </p>
            </div>
            <p className="text-xs" style={{ color: 'rgba(196,181,212,0.4)' }}>
              Redirecting to your dashboard…
            </p>
          </div>
        ) : (
          <>
            {/* Form card */}
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-2xl p-5 space-y-4"
              style={{
                background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              {/* Stage Name */}
              <div>
                <label
                  htmlFor="stageName"
                  className="block text-xs font-semibold mb-1.5 text-purple-300/80"
                >
                  Stage Name <span className="text-red-400" aria-hidden="true">*</span>
                </label>
                <input
                  id="stageName"
                  type="text"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  placeholder="Your artist name"
                  minLength={2}
                  maxLength={50}
                  required
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-purple-300/30 outline-none transition-all"
                  style={{
                    background: 'rgba(13,1,33,0.6)',
                    border: '1px solid rgba(168,85,247,0.3)',
                  }}
                  aria-describedby={fieldError ? 'stageName-error' : undefined}
                />
                {fieldError && (
                  <p id="stageName-error" className="mt-1 text-xs text-red-400" role="alert">
                    {fieldError}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="bio"
                  className="block text-xs font-semibold mb-1.5 text-purple-300/80"
                >
                  Bio <span className="text-purple-300/40 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself…"
                  rows={4}
                  disabled={isPending}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-purple-300/30 outline-none resize-none transition-all"
                  style={{
                    background: 'rgba(13,1,33,0.6)',
                    border: '1px solid rgba(168,85,247,0.3)',
                  }}
                />
              </div>

              {/* Server error */}
              {serverError && (
                <p className="text-xs text-red-400 text-center" role="alert">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                }}
              >
                {isPending ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>

            {/* Verification info */}
            <div
              className="w-full rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(168,85,247,0.2)',
              }}
            >
              <ShieldCheck size={18} className="text-purple-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(196,181,212,0.7)' }}>
                Once approved you can upload tracks. Verification badge is earned automatically
                when you reach{' '}
                <span className="text-purple-300 font-semibold">100 followers</span>,{' '}
                <span className="text-purple-300 font-semibold">5 published tracks</span>, and{' '}
                <span className="text-purple-300 font-semibold">50 total likes</span>.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

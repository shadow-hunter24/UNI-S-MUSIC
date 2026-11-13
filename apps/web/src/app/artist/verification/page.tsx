'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Check, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useMyVerificationStatus } from '@/lib/hooks/useArtist';

function ProgressBar({ current, required, label }: { current: number; required: number; label: string }) {
  const pct = Math.min(100, Math.round((current / required) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'rgba(196,181,212,0.7)' }}>{label}</span>
        <span className="font-semibold" style={{ color: pct >= 100 ? '#22c55e' : 'rgba(196,181,212,0.9)' }}>
          {current}/{required}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(124,58,237,0.15)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? 'linear-gradient(90deg,#22c55e,#16a34a)'
              : 'linear-gradient(90deg,#7c3aed,#a855f7)',
          }}
        />
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  PENDING: {
    bg: 'rgba(234,179,8,0.15)',
    color: '#fbbf24',
    border: 'rgba(234,179,8,0.3)',
    label: 'Under Review',
  },
  APPROVED: {
    bg: 'rgba(34,197,94,0.15)',
    color: '#22c55e',
    border: 'rgba(34,197,94,0.3)',
    label: 'Approved',
  },
  REJECTED: {
    bg: 'rgba(239,68,68,0.15)',
    color: '#ef4444',
    border: 'rgba(239,68,68,0.3)',
    label: 'Rejected',
  },
} as const;

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(124,58,237,0.15)' }}
    />
  );
}

export default function ArtistVerificationPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: status, isLoading: statusLoading } = useMyVerificationStatus();

  // Redirect listeners to apply page
  useEffect(() => {
    if (!userLoading && user && user.role !== 'ARTIST') {
      router.replace('/artist/apply');
    }
  }, [user, userLoading, router]);

  const isLoading = userLoading || statusLoading;
  const statusCfg = status ? STATUS_CONFIG[status.verificationStatus] : null;

  return (
    <div
      className="min-h-screen flex flex-col pb-24"
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
          href="/artist/dashboard"
          aria-label="Back"
          className="text-purple-300/60 hover:text-purple-300 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Get Verified</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 max-w-md mx-auto w-full">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))',
              boxShadow: '0 0 30px rgba(124,58,237,0.4)',
              border: '1px solid rgba(168,85,247,0.4)',
            }}
          >
            {status?.isVerified ? (
              <ShieldCheck size={38} className="text-green-400" aria-hidden="true" />
            ) : (
              <ShieldCheck size={38} className="text-accent" aria-hidden="true" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Artist Verification</h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'rgba(196,181,212,0.7)' }}>
              Grow your following and publish tracks to earn your verification badge automatically.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : (
          <>
            {/* Verified state */}
            {status?.isVerified && (
              <div
                className="rounded-2xl p-5 flex items-center gap-4"
                style={{
                  background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(16,185,129,0.1))',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(34,197,94,0.2)' }}
                >
                  <Check size={24} className="text-green-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-white font-bold">You are Verified!</p>
                  <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>
                    Your artist profile has been verified. Enjoy all benefits.
                  </p>
                </div>
              </div>
            )}

            {/* Status badge */}
            {status && statusCfg && (
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: statusCfg.bg,
                  border: `1px solid ${statusCfg.border}`,
                }}
              >
                {status.verificationStatus === 'PENDING' && (
                  <AlertCircle size={20} style={{ color: statusCfg.color }} aria-hidden="true" />
                )}
                {status.verificationStatus === 'APPROVED' && (
                  <Check size={20} style={{ color: statusCfg.color }} aria-hidden="true" />
                )}
                {status.verificationStatus === 'REJECTED' && (
                  <XCircle size={20} style={{ color: statusCfg.color }} aria-hidden="true" />
                )}
                <div>
                  <p className="font-semibold text-sm" style={{ color: statusCfg.color }}>
                    {statusCfg.label}
                  </p>
                  {status.verificationStatus === 'PENDING' && (
                    <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>
                      Your application is under review. We'll notify you when it's processed.
                    </p>
                  )}
                  {status.verificationStatus === 'REJECTED' && (
                    <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>
                      Your application was not approved. You can re-apply.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Progress card */}
            {status && !status.isVerified && (
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))',
                  border: '1px solid rgba(168,85,247,0.25)',
                }}
              >
                <h3 className="text-white font-bold text-sm">Auto-Verification Progress</h3>
                <ProgressBar
                  label="Followers"
                  current={status.autoVerifyProgress.followers.current}
                  required={status.autoVerifyProgress.followers.required}
                />
                <ProgressBar
                  label="Published Tracks"
                  current={status.autoVerifyProgress.tracks.current}
                  required={status.autoVerifyProgress.tracks.required}
                />
                <ProgressBar
                  label="Total Likes"
                  current={status.autoVerifyProgress.likes.current}
                  required={status.autoVerifyProgress.likes.required}
                />
                <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>
                  Reach all thresholds and you'll be verified automatically.
                </p>
              </div>
            )}

            {/* Re-apply for rejected */}
            {status?.verificationStatus === 'REJECTED' && (
              <Link
                href="/artist/apply"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                }}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Re-apply
              </Link>
            )}
          </>
        )}

      </main>

      <BottomNav />
    </div>
  );
}

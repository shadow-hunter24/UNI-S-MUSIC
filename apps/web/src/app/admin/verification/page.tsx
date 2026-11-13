'use client';
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { usePendingVerifications, useReviewVerification } from '@/lib/hooks/useArtist';

const PAYOUTS = [
  { name: 'BrightBeat', amount: 'GH₵ 50.00', date: '2h ago' },
  { name: 'KingDee', amount: 'GH₵ 120.00', date: '5h ago' },
  { name: 'Oma Lay', amount: 'GH₵ 32.40', date: '1d ago' },
];

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ''}`}
      style={{ background: 'rgba(124,58,237,0.15)' }}
    />
  );
}

export default function VerificationPage() {
  const { data, isLoading } = usePendingVerifications();
  const { mutate: reviewVerification, isPending: reviewing, variables: reviewingVars } =
    useReviewVerification();

  return (
    <div
      className="min-h-screen flex flex-col pb-20"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      <header
        className="flex items-center gap-3 px-4 py-4"
        style={{
          background: 'rgba(13,1,33,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(168,85,247,0.15)',
        }}
      >
        <Link href="/admin" aria-label="Back" className="text-purple-300/60 hover:text-purple-300">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Verification &amp; Payouts</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Verification requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm">Verification Requests</h2>
            {data && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}
              >
                {data.total} pending
              </span>
            )}
          </div>

          <div className="space-y-2">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              : !data?.items.length
              ? (
                <div className="text-center py-8">
                  <Check size={28} className="text-green-400/40 mx-auto mb-2" />
                  <p className="text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>
                    No pending verifications.
                  </p>
                </div>
              )
              : data.items.map((v) => {
                const isBeingReviewed = reviewing && reviewingVars?.id === v.id;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))',
                      border: '1px solid rgba(168,85,247,0.15)',
                    }}
                  >
                    {/* Avatar initial */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 shrink-0 uppercase"
                      style={{ background: 'rgba(124,58,237,0.25)' }}
                    >
                      {v.stageName[0] ?? '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{v.stageName}</p>
                      <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.5)' }}>
                        @{v.user.username} · {v.totalFollowers} followers · {v.totalTracks} tracks
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs px-2 py-1 rounded-full shrink-0 font-medium"
                      style={{ background: 'rgba(234,179,8,0.15)', color: '#fbbf24' }}
                    >
                      Pending
                    </span>

                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0">
                      {isBeingReviewed ? (
                        <Loader2 size={18} className="text-purple-300 animate-spin" />
                      ) : (
                        <>
                          <button
                            onClick={() => reviewVerification({ id: v.id, status: 'APPROVED' })}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:scale-110"
                            style={{ background: 'rgba(34,197,94,0.2)' }}
                            aria-label={`Approve ${v.stageName}`}
                          >
                            <Check size={13} className="text-green-400" />
                          </button>
                          <button
                            onClick={() => reviewVerification({ id: v.id, status: 'REJECTED' })}
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:scale-110"
                            style={{ background: 'rgba(239,68,68,0.2)' }}
                            aria-label={`Reject ${v.stageName}`}
                          >
                            <X size={13} className="text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Payout approvals — static for now */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Payout Approvals</h2>
          <div className="space-y-2">
            {PAYOUTS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))',
                  border: '1px solid rgba(168,85,247,0.15)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 shrink-0"
                  style={{ background: 'rgba(124,58,237,0.25)' }}
                >
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>{p.date}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                  <p className="text-white font-bold text-sm">{p.amount}</p>
                  <div className="flex gap-1">
                    <button
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
                    >
                      Approve
                    </button>
                    <button
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

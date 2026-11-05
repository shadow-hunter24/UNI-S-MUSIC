'use client';
import { ArrowLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const VERIFICATIONS = [
  { name: 'Burna Boy', type: 'Artist Verification', status: 'Pending' },
  { name: 'Rema', type: 'Artist Verification', status: 'Approved' },
  { name: 'Oma Lay', type: 'Artist Verification', status: 'Pending' },
  { name: 'Ann Start', type: 'Artist Verification', status: 'Rejected' },
];

const PAYOUTS = [
  { name: 'BrightBeat', amount: 'GH₵ 50.00', date: '2h ago' },
  { name: 'KingDee', amount: 'GH₵ 120.00', date: '5h ago' },
  { name: 'Oma Lay', amount: 'GH₵ 32.40', date: '1d ago' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
  Approved: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  Rejected: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

export default function VerificationPage() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="flex items-center gap-3 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <Link href="/admin" aria-label="Back" className="text-purple-300/60 hover:text-purple-300"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-bold text-white">Verification &amp; Payouts</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Verification requests */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Verification Requests</h2>
          <div className="space-y-2">
            {VERIFICATIONS.map((v) => {
              const s = STATUS_STYLE[v.status] ?? STATUS_STYLE['Pending']!;
              return (
                <div key={v.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 shrink-0" style={{ background: 'rgba(124,58,237,0.25)' }}>{v.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{v.name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.5)' }}>{v.type}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full shrink-0 font-medium" style={{ background: s.bg, color: s.color }}>{v.status}</span>
                  {v.status === 'Pending' && (
                    <div className="flex gap-1 shrink-0">
                      <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }} aria-label="Approve"><Check size={13} className="text-green-400" /></button>
                      <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }} aria-label="Reject"><X size={13} className="text-red-400" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payout approvals */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Payout Approvals</h2>
          <div className="space-y-2">
            {PAYOUTS.map((p) => (
              <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 shrink-0" style={{ background: 'rgba(124,58,237,0.25)' }}>{p.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{p.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>{p.date}</p>
                </div>
                <p className="text-white font-bold text-sm shrink-0">{p.amount}</p>
                <div className="flex gap-1 shrink-0">
                  <button className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Approve</button>
                  <button className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Reject</button>
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

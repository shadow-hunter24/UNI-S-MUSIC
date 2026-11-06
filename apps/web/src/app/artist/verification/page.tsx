'use client';
import { ShieldCheck, Check } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const BENEFITS = [
  'Verified badge on your profile',
  'Priority placement in search results',
  'Higher earnings per stream',
  'Access to advanced analytics & features',
];

const REQUIREMENTS = [
  'Valid government-issued ID',
  '10+ published tracks on the platform',
  'Active account in good standing',
];

export default function ArtistVerificationPage() {
  return (
    <div
      className="min-h-screen flex flex-col pb-24"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/artist/dashboard" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Get Verified</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6">

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
            <ShieldCheck size={38} className="text-accent" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Artist Verification</h2>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'rgba(196,181,212,0.7)' }}>
              Get verified to unlock exclusive benefits and stand out on the platform.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}
        >
          <h3 className="text-white font-bold text-sm mb-4">Verification Benefits</h3>
          <div className="space-y-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(34,197,94,0.2)' }}
                >
                  <Check size={11} className="text-green-400" aria-hidden="true" />
                </div>
                <p className="text-sm" style={{ color: 'rgba(196,181,212,0.85)' }}>{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}
        >
          <h3 className="text-white font-bold text-sm mb-4">Requirements</h3>
          <div className="space-y-3">
            {REQUIREMENTS.map((r, i) => (
              <div key={r} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                  style={{ background: 'rgba(124,58,237,0.3)', color: '#a855f7' }}
                >
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: 'rgba(196,181,212,0.85)' }}>{r}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Apply button */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          Apply for Verification
        </button>
        <p className="text-center text-xs mt-3" style={{ color: 'rgba(196,181,212,0.4)' }}>
          Review takes 2–5 business days
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

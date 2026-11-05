'use client';
import { ArrowLeft, CheckCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const BENEFITS = ['Verified badge in search results','Priority placement in search','Higher earnings potential','Access to advanced features'];
const REQUIREMENTS = ['Valid Government ID','10+ original tracks uploaded','Active account in good standing'];

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="flex items-center gap-3 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-bold text-white">Artist Verification</h1>
      </header>

      <main className="flex-1 px-4 py-8 flex flex-col items-center text-center max-w-sm mx-auto w-full">
        {/* Shield icon */}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))', boxShadow: '0 0 40px rgba(124,58,237,0.4)', border: '1px solid rgba(168,85,247,0.4)' }}>
          <Shield size={44} className="text-accent" aria-hidden="true" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
            <CheckCircle size={16} className="text-white" aria-hidden="true" />
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-2">Get Verified</h2>
        <p className="text-sm mb-8" style={{ color: 'rgba(196,181,212,0.7)' }}>Stand out, build trust, and unlock more opportunities for your music career.</p>

        {/* Benefits */}
        <div className="w-full rounded-2xl p-5 mb-4 text-left" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.25)' }}>
          <p className="text-white font-bold text-sm mb-3">Benefits</p>
          <ul className="space-y-2.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm" style={{ color: '#c4b5d4' }}>
                <CheckCircle size={15} className="text-accent shrink-0" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div className="w-full rounded-2xl p-5 mb-8 text-left" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <p className="text-white font-bold text-sm mb-3">Requirements</p>
          <ul className="space-y-2.5">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex items-center gap-3 text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#a855f7' }} aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <button className="w-full py-3.5 rounded-xl font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
          Apply for Verification
        </button>
      </main>
      <BottomNav />
    </div>
  );
}

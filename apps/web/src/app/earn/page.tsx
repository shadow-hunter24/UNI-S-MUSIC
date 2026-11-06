'use client';
import { useState } from 'react';
import { ArrowLeft, Megaphone, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

type AdDuration = '30s-song-voiceover' | '15s-voiceover' | '15s-song';

const AD_DURATIONS: { id: AdDuration; label: string; sub: string }[] = [
  { id: '30s-song-voiceover', label: '30s Song + Voiceover', sub: 'Most effective — plays before tracks' },
  { id: '15s-voiceover', label: '15s Voiceover Only', sub: 'Budget option — voice ad only' },
  { id: '15s-song', label: '15s Song Only', sub: 'Quick promo — short song snippet' },
];

export default function EarnPage() {
  const [adDuration, setAdDuration] = useState<AdDuration>('30s-song-voiceover');
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');

  const bg = { background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' };
  const card = {
    background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))',
    border: '1px solid rgba(168,85,247,0.25)',
  };

  return (
    <div className="min-h-screen flex flex-col pb-24" style={bg}>
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Earn</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-6">

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/earn/payouts"
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:scale-[1.02]"
            style={card}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.2)' }}>
              <DollarSign size={18} className="text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Payouts</p>
              <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>$24.60 available</p>
            </div>
          </Link>
          <div
            className="flex items-center gap-3 p-4 rounded-xl"
            style={card}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
              <TrendingUp size={18} className="text-accent" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Streams</p>
              <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>48,210 this month</p>
            </div>
          </div>
        </div>

        {/* Create Your Ad */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone size={16} className="text-accent" aria-hidden="true" />
            <h2 className="text-white font-bold text-base">Create Your Ad</h2>
          </div>

          {/* Ad Duration radio */}
          <div className="mb-4">
            <p className="text-xs font-medium mb-3" style={{ color: 'rgba(196,181,212,0.8)' }}>Ad Duration</p>
            <div className="space-y-2" role="radiogroup" aria-label="Ad duration">
              {AD_DURATIONS.map(({ id, label, sub }) => {
                const isSelected = adDuration === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setAdDuration(id)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(168,85,247,0.1))'
                        : 'rgba(124,58,237,0.08)',
                      border: isSelected ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(168,85,247,0.15)',
                    }}
                  >
                    {/* Radio circle */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        border: isSelected ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)',
                      }}
                    >
                      {isSelected && (
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.8)' }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm">{label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.5)' }}>{sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title field */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'rgba(196,181,212,0.8)' }}>
              Ad Title
            </label>
            <input
              type="text"
              placeholder="Enter your ad title"
              value={adTitle}
              onChange={(e) => setAdTitle(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none transition-all"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Description field */}
          <div className="mb-5">
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'rgba(196,181,212,0.8)' }}>
              Description
            </label>
            <textarea
              placeholder="Describe your ad campaign…"
              value={adDescription}
              onChange={(e) => setAdDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none resize-none"
              style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Submit Ad button */}
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
          >
            <Megaphone size={16} aria-hidden="true" />
            Submit Ad
          </button>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}

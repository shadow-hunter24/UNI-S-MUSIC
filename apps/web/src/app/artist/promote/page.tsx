'use client';
import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const DURATIONS = [
  { id: '30s', label: '30 seconds', sub: 'Song + Voiceover', desc: 'Full-length ad with music and voice' },
  { id: '15s', label: '15 seconds', sub: 'Voiceover only', desc: 'Short voice-only promotional spot' },
  { id: '10s', label: '10 seconds', sub: 'Song only', desc: 'Quick music snippet to grab attention' },
];

export default function PromotePage() {
  const [selected, setSelected] = useState('30s');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="flex items-center justify-between px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3">
          <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold text-white">Adverts / Promotion</h1>
        </div>
        <Link href="/home" aria-label="Close" className="text-purple-300/60 hover:text-purple-300"><X size={20} /></Link>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">
        <div>
          <h2 className="text-white font-bold text-base mb-1">Create Your Ad</h2>
          <p className="text-sm" style={{ color: 'rgba(196,181,212,0.6)' }}>Use your music for promotion</p>
        </div>

        {/* Duration selection */}
        <div className="space-y-3">
          {DURATIONS.map((d) => (
            <button key={d.id} onClick={() => setSelected(d.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: selected === d.id ? 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.15))' : 'rgba(124,58,237,0.08)', border: `1px solid ${selected === d.id ? 'rgba(168,85,247,0.5)' : 'rgba(168,85,247,0.15)'}`, boxShadow: selected === d.id ? '0 0 15px rgba(124,58,237,0.2)' : 'none' }}>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all" style={{ borderColor: selected === d.id ? '#a855f7' : 'rgba(168,85,247,0.4)' }}>
                {selected === d.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#a855f7' }} />}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{d.label} <span className="text-accent text-xs">({d.sub})</span></p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.6)' }}>{d.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Ad details */}
        <div className="space-y-4">
          <p className="text-white font-bold text-sm">Your ad details</p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My New Single" className="rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Check out my new single 'Forever'…" rows={3} className="rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none resize-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} />
          </div>
        </div>

        <button className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
          Submit Ad
        </button>
      </main>
      <BottomNav />
    </div>
  );
}

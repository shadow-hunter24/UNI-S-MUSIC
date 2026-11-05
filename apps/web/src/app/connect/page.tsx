'use client';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const MOCK_MSGS = [
  { id: '1', name: 'BrightBeat', msg: 'Hey! Your new song is amazing!', time: '2m', unread: true },
  { id: '2', name: 'Amara', msg: 'Can you do more songs?', time: '5m', unread: true },
  { id: '3', name: 'KingDee', msg: 'I love your tracks!', time: '1h', unread: false },
  { id: '4', name: 'Ella', msg: 'When is your next release?', time: '3h', unread: false },
  { id: '5', name: 'JayTee', msg: 'You\'re on the next level!', time: '1d', unread: false },
];

export default function ConnectPage() {
  const [tab, setTab] = useState<'fans' | 'artists'>('fans');
  const bg = { background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' };

  return (
    <div className="min-h-screen flex flex-col pb-20 relative" style={bg}>
      <header className="sticky top-0 z-20 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <h1 className="text-lg font-bold text-white mb-3">Messaging &amp; Fan Engagement</h1>
        <div className="flex gap-2">
          {(['fans','artists'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
              style={{ background: tab === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)', color: tab === t ? 'white' : 'rgba(196,181,212,0.7)', border: tab === t ? 'none' : '1px solid rgba(168,85,247,0.2)' }}>
              {t}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-3 space-y-2">
        {MOCK_MSGS.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}>
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-purple-300" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}>
                {m.name[0]}
              </div>
              {m.unread && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.8)' }} aria-hidden="true" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{m.name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>{m.msg}</p>
            </div>
            <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{m.time}</span>
          </div>
        ))}
      </main>

      {/* Coming soon overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 px-6 text-center" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.2))', border: '1px solid rgba(168,85,247,0.3)' }}>
          <MessageCircle size={28} className="text-accent" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Messaging Coming Soon</h2>
        <p className="text-sm max-w-xs" style={{ color: 'rgba(196,181,212,0.7)' }}>Direct messaging and fan engagement tools are coming in a future update. Stay tuned!</p>
      </div>

      <BottomNav />
    </div>
  );
}

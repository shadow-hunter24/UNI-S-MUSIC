'use client';
import { useState } from 'react';
import { PenSquare } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

type ConnectTab = 'fans' | 'artists';

const MOCK_MSGS = [
  { id: '1', name: 'BrightBeat', preview: 'Hey! Your new song is amazing!', time: '2m', unread: true },
  { id: '2', name: 'Amara', preview: 'Can you do more songs like this?', time: '5m', unread: true },
  { id: '3', name: 'KingDee', preview: 'I love your tracks bro 🔥', time: '1h', unread: false },
  { id: '4', name: 'Ella', preview: 'When is your next release?', time: '3h', unread: false },
  { id: '5', name: 'JayTee', preview: "You're on the next level!", time: '1d', unread: false },
  { id: '6', name: 'Oma Lay Fan', preview: 'Stream count is going crazy!', time: '2d', unread: false },
];

export default function ConnectPage() {
  const [tab, setTab] = useState<ConnectTab>('fans');

  return (
    <div
      className="min-h-screen flex flex-col pb-20"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-white">Messaging</h1>
          <button
            aria-label="Compose message"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}
          >
            <PenSquare size={16} className="text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" role="tablist">
          {(['fans', 'artists'] as ConnectTab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="px-5 py-1.5 rounded-full text-xs font-bold capitalize transition-all"
              style={{
                background: tab === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)',
                color: tab === t ? 'white' : 'rgba(196,181,212,0.7)',
                border: tab === t ? 'none' : '1px solid rgba(168,85,247,0.2)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* Message list */}
      <main className="flex-1 px-4 py-3 space-y-2">
        {MOCK_MSGS.map((m) => (
          <button
            key={m.id}
            className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] text-left"
            style={{
              background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))',
              border: '1px solid rgba(168,85,247,0.15)',
            }}
            aria-label={`Message from ${m.name}: ${m.preview}`}
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-purple-300"
                style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}
                aria-hidden="true"
              >
                {m.name[0]}
              </div>
              {m.unread && (
                <div
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.8)' }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{m.name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>{m.preview}</p>
            </div>

            {/* Time */}
            <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{m.time}</span>
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  );
}

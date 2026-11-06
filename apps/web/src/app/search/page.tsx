'use client';
import { useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { MiniPlayer } from '@/components/music/MiniPlayer';

const FILTER_TABS = ['Top', 'Artists', 'Songs', 'Albums', 'Playlists'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const GENRES = [
  { name: 'Afrobeats', slug: 'afrobeats', from: '#ec4899', to: '#7c3aed' },
  { name: 'Hip Hop', slug: 'hip-hop', from: '#7c3aed', to: '#4338ca' },
  { name: 'Gospel', slug: 'gospel', from: '#2563eb', to: '#7c3aed' },
  { name: 'R&B', slug: 'rnb', from: '#9333ea', to: '#db2777' },
  { name: 'Reggae', slug: 'reggae', from: '#059669', to: '#0d9488' },
  { name: 'Electronic', slug: 'electronic', from: '#0891b2', to: '#2563eb' },
  { name: 'Rock', slug: 'rock', from: '#dc2626', to: '#e11d48' },
  { name: 'Country', slug: 'country', from: '#d97706', to: '#ea580c' },
];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<FilterTab>('Top');

  return (
    <div className="min-h-screen flex flex-col pb-36" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-3"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-white">Search</h1>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search artists, songs, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search query"
            className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none transition-all"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
          {FILTER_TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
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

      <main className="flex-1 px-4 py-5">
        {/* Genre grid */}
        <div className="mb-4">
          <h2 className="text-white font-bold text-sm mb-3">Browse Genres</h2>
          <div className="grid grid-cols-2 gap-3">
            {GENRES.map((g) => (
              <Link
                key={g.slug}
                href={`/genre/${g.slug}`}
                className="relative overflow-hidden rounded-xl py-6 px-4 flex items-center justify-center transition-all hover:scale-[1.03]"
                style={{ background: `linear-gradient(135deg,${g.from},${g.to})`, boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
              >
                <span className="text-white font-bold text-sm">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Play, Clock } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { MiniPlayer } from '@/components/music/MiniPlayer';

type SubTab = 'Top Tracks' | 'Albums' | 'Playlists';
const SUB_TABS: SubTab[] = ['Top Tracks', 'Albums', 'Playlists'];

const GENRE_COLORS: Record<string, { from: string; to: string }> = {
  afrobeats:   { from: '#ec4899', to: '#7c3aed' },
  'hip-hop':   { from: '#7c3aed', to: '#4338ca' },
  gospel:      { from: '#2563eb', to: '#7c3aed' },
  rnb:         { from: '#9333ea', to: '#db2777' },
  reggae:      { from: '#059669', to: '#0d9488' },
  electronic:  { from: '#0891b2', to: '#2563eb' },
  rock:        { from: '#dc2626', to: '#e11d48' },
  country:     { from: '#d97706', to: '#ea580c' },
};

const GENRE_LABELS: Record<string, string> = {
  afrobeats: 'Afrobeats',
  'hip-hop': 'Hip Hop',
  gospel: 'Gospel',
  rnb: 'R&B',
  reggae: 'Reggae',
  electronic: 'Electronic',
  rock: 'Rock',
  country: 'Country',
};

const MOCK_ARTISTS = ['Burna Boy', 'Wizkid', 'Sarkodie', 'Tiwa Savage', 'Davido'];

const MOCK_TRACKS = [
  { rank: 1, title: 'City Boys', artist: 'Burna Boy', duration: '3:42', plays: '2.1M' },
  { rank: 2, title: 'Essence', artist: 'Wizkid ft. Tems', duration: '3:55', plays: '4.3M' },
  { rank: 3, title: 'Afro Nation', artist: 'Sarkodie', duration: '4:01', plays: '1.8M' },
  { rank: 4, title: 'Somebody Baby', artist: 'Tiwa Savage', duration: '3:28', plays: '900K' },
  { rank: 5, title: 'Fall', artist: 'Davido', duration: '3:56', plays: '6.2M' },
  { rank: 6, title: 'Ojuelegba', artist: 'Wizkid', duration: '3:47', plays: '3.1M' },
];

export default function GenrePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';
  const [subTab, setSubTab] = useState<SubTab>('Top Tracks');

  const colors = GENRE_COLORS[slug] ?? { from: '#7c3aed', to: '#a855f7' };
  const label = GENRE_LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen flex flex-col pb-36" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Genre header */}
      <div
        className="relative px-4 pt-12 pb-6"
        style={{ background: `linear-gradient(135deg,${colors.from},${colors.to})` }}
      >
        <Link
          href="/search"
          aria-label="Back"
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </Link>
        <h1 className="text-3xl font-black text-white mt-2">{label}</h1>
        <p className="text-sm text-white/70 mt-1">Discover the best {label} tracks</p>
      </div>

      {/* Sub-tabs */}
      <div
        className="sticky top-0 z-20 flex gap-1 px-4 py-3"
        style={{ background: 'rgba(13,1,33,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
        role="tablist"
      >
        {SUB_TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={subTab === t}
            onClick={() => setSubTab(t)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: subTab === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)',
              color: subTab === t ? 'white' : 'rgba(196,181,212,0.7)',
              border: subTab === t ? 'none' : '1px solid rgba(168,85,247,0.2)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 py-4 space-y-5">
        {/* Artist chips */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Top Artists</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {MOCK_ARTISTS.map((a) => (
              <button
                key={a}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
                style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: '#c4b5d4' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-purple-300"
                  style={{ background: `linear-gradient(135deg,${colors.from},${colors.to})` }}
                >
                  {a[0]}
                </div>
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Track list */}
        {subTab === 'Top Tracks' && (
          <div>
            <h2 className="text-white font-bold text-sm mb-3">Top Tracks</h2>
            <div className="space-y-2">
              {MOCK_TRACKS.map((track) => (
                <div
                  key={track.rank}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                  style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}
                >
                  {/* Rank */}
                  <span className="w-5 text-center text-xs font-bold shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{track.rank}</span>

                  {/* Cover placeholder */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg,${colors.from}66,${colors.to}44)` }}
                  >
                    <Play size={14} className="text-white/60" aria-hidden="true" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{track.title}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>{track.artist}</p>
                  </div>

                  {/* Plays */}
                  <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{track.plays}</span>

                  {/* Duration */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock size={11} className="text-purple-400/40" aria-hidden="true" />
                    <span className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>{track.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab !== 'Top Tracks' && (
          <div className="flex flex-col items-center py-16 gap-3">
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>{subTab} coming soon.</p>
          </div>
        )}
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

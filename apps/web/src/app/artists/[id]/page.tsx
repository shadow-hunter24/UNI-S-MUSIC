'use client';
import { useState } from 'react';
import { ArrowLeft, CheckCircle, MessageCircle, Play, Music } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { MiniPlayer } from '@/components/music/MiniPlayer';

type ArtistTab = 'Top Tracks' | 'Albums' | 'Playlists';
const TABS: ArtistTab[] = ['Top Tracks', 'Albums', 'Playlists'];

const MOCK_TRACKS = [
  { rank: 1, title: 'City Boys', duration: '3:42' },
  { rank: 2, title: 'Essence', duration: '3:55' },
  { rank: 3, title: 'Afro Nation', duration: '4:01' },
  { rank: 4, title: 'Somebody Baby', duration: '3:28' },
  { rank: 5, title: 'Fall', duration: '3:56' },
];

export default function ArtistProfilePage() {
  const [tab, setTab] = useState<ArtistTab>('Top Tracks');
  const [following, setFollowing] = useState(false);

  return (
    <div className="min-h-screen flex flex-col pb-36" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Gradient header */}
      <div
        className="relative h-52"
        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.7),rgba(168,85,247,0.5),rgba(13,1,33,0.8))' }}
      >
        <Link
          href="/home"
          aria-label="Back"
          className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10"
          style={{ background: 'rgba(13,1,33,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(168,85,247,0.3)' }}
        >
          <ArrowLeft size={18} className="text-white" />
        </Link>

        {/* Glow */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse,rgba(168,85,247,0.4) 0%,transparent 70%)', filter: 'blur(20px)' }}
          aria-hidden="true"
        />
      </div>

      <main className="flex-1 px-4 -mt-12 relative z-10">
        {/* Avatar */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.6),rgba(168,85,247,0.4))',
            boxShadow: '0 0 0 3px rgba(168,85,247,0.4), 0 0 25px rgba(124,58,237,0.4)',
            border: '3px solid #0d0121',
          }}
        >
          <span className="text-3xl font-black text-purple-300">BK</span>
        </div>

        {/* Name + verified */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-white">BrightKing</h1>
          <CheckCircle className="w-5 h-5 text-accent" aria-label="Verified" />
        </div>

        {/* Follower stats */}
        <div className="flex items-center gap-4 mb-5">
          <div>
            <span className="text-white font-bold text-sm">24.5K</span>
            <span className="text-xs ml-1" style={{ color: 'rgba(196,181,212,0.6)' }}>Followers</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm">48</span>
            <span className="text-xs ml-1" style={{ color: 'rgba(196,181,212,0.6)' }}>Tracks</span>
          </div>
          <div>
            <span className="text-white font-bold text-sm">1.2M</span>
            <span className="text-xs ml-1" style={{ color: 'rgba(196,181,212,0.6)' }}>Streams</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setFollowing(!following)}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
            style={following
              ? { border: '1px solid rgba(168,85,247,0.5)', color: '#a855f7', background: 'transparent' }
              : { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }
            }
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105"
            style={{ border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}
          >
            <MessageCircle size={15} aria-hidden="true" />
            Message
          </button>
        </div>

        {/* Bio */}
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(196,181,212,0.7)' }}>
          Afrobeats artist from Lagos. Creating music that moves the world. Multiple award winner and chart-topper across Africa.
        </p>

        {/* Tabs */}
        <div
          className="flex gap-4 border-b mb-5"
          style={{ borderColor: 'rgba(168,85,247,0.2)' }}
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className="pb-3 text-sm font-semibold transition-all"
              style={{
                color: tab === t ? '#a855f7' : 'rgba(196,181,212,0.5)',
                borderBottom: tab === t ? '2px solid #a855f7' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Top Tracks */}
        {tab === 'Top Tracks' && (
          <div className="space-y-2">
            {MOCK_TRACKS.map((track) => (
              <div
                key={track.rank}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}
              >
                <span className="w-5 text-center text-xs font-bold shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{track.rank}</span>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}
                >
                  <Play size={14} className="text-white/60" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{track.title}</p>
                  <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>BrightKing</p>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.5)' }}>{track.duration}</span>
              </div>
            ))}
          </div>
        )}

        {tab !== 'Top Tracks' && (
          <div className="flex flex-col items-center py-16 gap-3">
            <Music size={40} className="text-purple-400/30" aria-hidden="true" />
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>{tab} coming soon.</p>
          </div>
        )}
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

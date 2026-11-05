'use client';
import { useState } from 'react';
import { ArrowLeft, Heart, Share2, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Plus, Music } from 'lucide-react';
import Link from 'next/link';

export default function PlayerPage() {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);

  return (
    <div className="min-h-screen flex flex-col px-4 py-6" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#1a0533 40%,#0d0121 100%)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <Link href="/home" aria-label="Back" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
          <ArrowLeft size={18} className="text-purple-300" />
        </Link>
        <p className="text-xs font-semibold text-purple-300/70 tracking-widest uppercase">Now Playing</p>
        <div className="w-9 h-9" />
      </div>

      {/* Cover art */}
      <div className="flex justify-center mb-8">
        <div className="w-64 h-64 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(168,85,247,0.3))', boxShadow: '0 0 60px rgba(124,58,237,0.5), 0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(168,85,247,0.3)' }}>
          <Music size={60} className="text-purple-400/40" aria-hidden="true" />
        </div>
      </div>

      {/* Track info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white mb-1">Select a Track</h1>
          <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>Artist Name</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLiked(!liked)} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}>
            <Heart size={22} className={liked ? 'text-red-400 fill-red-400' : 'text-purple-400/60'} style={liked ? { filter: 'drop-shadow(0 0 6px rgba(248,113,113,0.6))' } : undefined} />
          </button>
          <button aria-label="Add to playlist"><Plus size={22} className="text-purple-400/60" /></button>
          <button aria-label="Share"><Share2 size={20} className="text-purple-400/60" /></button>
        </div>
      </div>

      {/* Seek bar */}
      <div className="mb-6">
        <div className="relative h-1.5 rounded-full mb-2 cursor-pointer" style={{ background: 'rgba(168,85,247,0.2)' }}>
          <div className="h-full w-1/3 rounded-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#a855f7)', boxShadow: '0 0 8px rgba(168,85,247,0.5)' }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg" style={{ left: 'calc(33% - 8px)', boxShadow: '0 0 10px rgba(168,85,247,0.6)' }} />
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>
          <span>1:12</span>
          <span>3:24</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-8">
        <button aria-label="Shuffle" className="text-purple-400/50 hover:text-purple-300 transition-colors"><Shuffle size={20} /></button>
        <button aria-label="Previous" className="text-purple-300/80 hover:text-white transition-colors"><SkipBack size={28} /></button>
        <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 30px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.3)' }}>
          {playing
            ? <Pause className="w-7 h-7 text-white fill-white" />
            : <Play className="w-7 h-7 text-white fill-white ml-1" />
          }
        </button>
        <button aria-label="Next" className="text-purple-300/80 hover:text-white transition-colors"><SkipForward size={28} /></button>
        <button aria-label="Repeat" className="text-purple-400/50 hover:text-purple-300 transition-colors"><Repeat size={20} /></button>
      </div>

      {/* Up Next */}
      <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.2)' }}>
        <p className="text-xs font-semibold text-purple-300/70 mb-3">Up Next</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.3)' }}>
            <Music size={16} className="text-purple-400/60" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">Next Track</p>
            <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>Artist</p>
          </div>
        </div>
      </div>
    </div>
  );
}

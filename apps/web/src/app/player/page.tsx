'use client';
import { useState } from 'react';
import { ArrowLeft, Heart, Share2, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Music, Volume2 } from 'lucide-react';
import Link from 'next/link';

const UP_NEXT = [
  { title: 'Essence', artist: 'Wizkid ft. Tems' },
  { title: 'City Boys', artist: 'Burna Boy' },
  { title: 'Fall', artist: 'Davido' },
];

export default function PlayerPage() {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [volume, setVolume] = useState(75);

  return (
    <div
      className="min-h-screen flex flex-col px-4 py-6 pb-10 overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#1a0533 0%,#0d0121 40%,#130329 80%,#0d0121 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse,rgba(124,58,237,0.35) 0%,transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      {/* Top bar */}
      <div className="relative flex items-center justify-between mb-8">
        <Link
          href="/home"
          aria-label="Back"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}
        >
          <ArrowLeft size={18} className="text-purple-300" />
        </Link>
        <p className="text-xs font-semibold text-purple-300/70 tracking-widest uppercase">Now Playing</p>
        <button aria-label="Share">
          <Share2 size={18} className="text-purple-400/60" />
        </button>
      </div>

      {/* Cover art */}
      <div className="relative flex justify-center mb-8">
        <div
          className="w-64 h-64 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(168,85,247,0.3))',
            boxShadow: '0 0 60px rgba(124,58,237,0.5), 0 0 20px rgba(124,58,237,0.4), 0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(168,85,247,0.3)',
          }}
        >
          <Music size={64} className="text-purple-400/40" aria-hidden="true" />
        </div>
      </div>

      {/* Track info + heart */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white mb-1">Afro Nation</h1>
          <p className="text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>Sarkodie</p>
        </div>
        <button
          onClick={() => setLiked(!liked)}
          aria-label={liked ? 'Unlike' : 'Like'}
          aria-pressed={liked}
        >
          <Heart
            size={24}
            className={liked ? 'text-red-400 fill-red-400' : 'text-purple-400/60'}
            style={liked ? { filter: 'drop-shadow(0 0 6px rgba(248,113,113,0.6))' } : undefined}
          />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div
          className="relative h-1.5 rounded-full mb-2 cursor-pointer"
          style={{ background: 'rgba(168,85,247,0.2)' }}
          role="progressbar"
          aria-valuenow={33}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full w-1/3 rounded-full"
            style={{ background: 'linear-gradient(90deg,#7c3aed,#a855f7)', boxShadow: '0 0 8px rgba(168,85,247,0.5)' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg"
            style={{ left: 'calc(33% - 8px)', boxShadow: '0 0 10px rgba(168,85,247,0.6)' }}
          />
        </div>
        <div className="flex justify-between text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>
          <span>1:21</span>
          <span>4:01</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setShuffle(!shuffle)}
          aria-label="Shuffle"
          aria-pressed={shuffle}
          className="transition-colors"
          style={{ color: shuffle ? '#a855f7' : 'rgba(196,181,212,0.4)' }}
        >
          <Shuffle size={20} />
        </button>
        <button aria-label="Previous" className="text-purple-300/80 hover:text-white transition-colors">
          <SkipBack size={28} />
        </button>
        <button
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            boxShadow: '0 0 30px rgba(124,58,237,0.6), 0 0 60px rgba(124,58,237,0.3)',
          }}
        >
          {playing
            ? <Pause className="w-7 h-7 text-white fill-white" />
            : <Play className="w-7 h-7 text-white fill-white ml-1" />
          }
        </button>
        <button aria-label="Next" className="text-purple-300/80 hover:text-white transition-colors">
          <SkipForward size={28} />
        </button>
        <button
          onClick={() => setRepeat(!repeat)}
          aria-label="Repeat"
          aria-pressed={repeat}
          className="transition-colors"
          style={{ color: repeat ? '#a855f7' : 'rgba(196,181,212,0.4)' }}
        >
          <Repeat size={20} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mb-6">
        <Volume2 size={16} className="text-purple-400/50 shrink-0" aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume"
          className="flex-1 h-1.5 rounded-full outline-none cursor-pointer"
          style={{ accentColor: '#a855f7' }}
        />
        <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.5)' }}>{volume}%</span>
      </div>

      {/* Up Next */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.2)' }}
      >
        <p className="text-xs font-semibold text-purple-300/70 mb-3">Up Next</p>
        <div className="space-y-2.5">
          {UP_NEXT.map((track) => (
            <div key={track.title} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(124,58,237,0.3)' }}
              >
                <Music size={14} className="text-purple-400/60" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{track.title}</p>
                <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.6)' }}>{track.artist}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

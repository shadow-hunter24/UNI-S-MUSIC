'use client';
import { Play, Pause, Volume2 } from 'lucide-react';
import Image from 'next/image';
import { usePlayer } from '@/providers/PlayerProvider';

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Player() {
  const { current, isPlaying, currentTime, duration, volume, toggle, seek, setVolume } = usePlayer();

  if (!current) return null;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-50 px-3 py-2 md:bottom-0"
      style={{
        background: 'rgba(13,1,33,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(168,85,247,0.25)',
        boxShadow: '0 -4px 20px rgba(124,58,237,0.2)',
      }}
      role="region"
      aria-label="Now playing"
    >
      <div className="flex items-center gap-3 max-w-screen-lg mx-auto">
        {/* Cover */}
        <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}>
          {current.coverImageUrl ? (
            <Image
              src={current.coverImageUrl}
              alt={`Cover art for ${current.title}`}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-purple-400/60 text-xs" aria-hidden="true">♪</span>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate" title={current.title}>
            {current.title}
          </p>
          <p className="text-purple-300/60 text-xs truncate">{current.artistName}</p>
        </div>

        {/* Seek slider */}
        <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs">
          <span className="text-purple-300/50 text-xs tabular-nums">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Seek"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            aria-valuetext={formatTime(currentTime)}
            className="flex-1 accent-purple-500 h-1 cursor-pointer"
            style={{ accentColor: '#a855f7' }}
          />
          <span className="text-purple-300/50 text-xs tabular-nums">{formatTime(duration)}</span>
        </div>

        {/* Play/Pause */}
        <button
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            boxShadow: '0 0 12px rgba(124,58,237,0.5)',
          }}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white fill-white" aria-hidden="true" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white" aria-hidden="true" />
          )}
        </button>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Volume2 className="w-3.5 h-3.5 text-purple-400/60" aria-hidden="true" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={volume}
            className="w-20 h-1 cursor-pointer"
            style={{ accentColor: '#a855f7' }}
          />
        </div>
      </div>
    </div>
  );
}

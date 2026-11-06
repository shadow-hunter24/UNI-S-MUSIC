'use client';
import { Play, Pause, Heart } from 'lucide-react';
import Link from 'next/link';
import { usePlayer } from '@/providers/PlayerProvider';

export function MiniPlayer() {
  const { current, isPlaying, currentTime, duration, toggle } = usePlayer();

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 px-3 py-2 md:bottom-0"
      style={{
        background: 'rgba(13,1,33,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(168,85,247,0.2)',
        boxShadow: '0 -4px 20px rgba(124,58,237,0.15)',
      }}
      role="complementary"
      aria-label="Now playing"
    >
      <div className="flex items-center gap-3">
        {/* Cover / Link to track */}
        {current ? (
          <Link href={`/tracks/${current.id}`} className="shrink-0" aria-label={`Open ${current.title}`}>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}
            >
              <span className="text-white text-sm" aria-hidden="true">♪</span>
            </div>
          </Link>
        ) : (
          <div
            className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}
            aria-hidden="true"
          >
            <Play className="w-4 h-4 text-purple-400/60" aria-hidden="true" />
          </div>
        )}

        {/* Info + progress bar */}
        <div className="flex-1 min-w-0">
          {current ? (
            <>
              <p className="text-white text-xs font-semibold truncate">{current.title}</p>
              <p className="text-purple-300/50 text-xs truncate">{current.artistName}</p>
            </>
          ) : (
            <p className="text-white text-xs font-semibold truncate">Select a track to play</p>
          )}
          <div
            className="mt-1 h-0.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(168,85,247,0.2)' }}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button aria-label="Like" className="text-purple-400/40">
            <Heart size={16} aria-hidden="true" />
          </button>
          <button
            onClick={toggle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            disabled={!current}
            className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              boxShadow: '0 0 10px rgba(124,58,237,0.5)',
            }}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 text-white fill-white" aria-hidden="true" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white fill-white" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

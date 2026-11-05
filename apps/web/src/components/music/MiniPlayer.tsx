'use client';
import { Play, Heart, ChevronUp } from 'lucide-react';
import Link from 'next/link';

export function MiniPlayer() {
  // Phase 4 will wire real playback state. Shows a static preview bar.
  return (
    <div
      className="fixed bottom-16 left-0 right-0 z-40 px-3 py-2 md:bottom-0"
      style={{ background: 'rgba(13,1,33,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(168,85,247,0.2)', boxShadow: '0 -4px 20px rgba(124,58,237,0.15)' }}
      role="complementary"
      aria-label="Now playing"
    >
      <div className="flex items-center gap-3">
        {/* Cover */}
        <Link href="/player" className="shrink-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}>
            <Play className="w-4 h-4 text-purple-400/60" aria-hidden="true" />
          </div>
        </Link>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-semibold truncate">Select a track to play</p>
          <div className="mt-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(168,85,247,0.2)' }}>
            <div className="h-full w-0 rounded-full" style={{ background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
          </div>
        </div>
        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button aria-label="Like" className="text-purple-400/40"><Heart size={16} /></button>
          <button aria-label="Play" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 10px rgba(124,58,237,0.5)' }}>
            <Play className="w-3.5 h-3.5 text-white fill-white" aria-hidden="true" />
          </button>
          <Link href="/player" aria-label="Open player" className="text-purple-400/40 hover:text-purple-300">
            <ChevronUp size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

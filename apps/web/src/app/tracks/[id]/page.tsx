'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Pause, Heart, Music } from 'lucide-react';
import { useTrack } from '@/lib/hooks/useTracks';
import { usePlayer } from '@/providers/PlayerProvider';
import { BottomNav } from '@/components/layout/BottomNav';

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data: track, isLoading, error } = useTrack(id);
  const { play, toggle, current, isPlaying } = usePlayer();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0121' }}>
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0d0121' }}>
        <Music size={48} className="text-purple-400/40" aria-hidden="true" />
        <h1 className="text-white font-bold text-xl">Track Not Found</h1>
        <p className="text-purple-300/60 text-sm text-center">
          This track may not be published or doesn&apos;t exist.
        </p>
        <Link href="/home" className="text-purple-400 hover:text-purple-300 text-sm">
          Go back home
        </Link>
      </div>
    );
  }

  const isCurrentTrack = current?.id === track.id;

  const handlePlayToggle = () => {
    if (isCurrentTrack) {
      toggle();
    } else {
      play(track);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-32" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/home" className="text-purple-300/60 hover:text-purple-300" aria-label="Back">
          ← Back
        </Link>
        <h1 className="text-lg font-bold text-white truncate">{track.title}</h1>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Cover art */}
        <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 20px 60px rgba(124,58,237,0.3)' }}>
          {track.coverImageUrl ? (
            <Image
              src={track.coverImageUrl}
              alt={`Cover art for ${track.title}`}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.15))' }}>
              <Music size={80} className="text-purple-400/30" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="space-y-1">
          <h2 className="text-white text-2xl font-bold">{track.title}</h2>
          <Link
            href={`/artist/${track.artistId}`}
            className="text-purple-300/80 hover:text-purple-300 text-sm font-medium"
          >
            {track.artistName}
          </Link>
          {track.genreName && (
            <p className="text-purple-400/50 text-xs">{track.genreName}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <span className="text-purple-300/60 text-sm">
            {track.playCount.toLocaleString()} plays
          </span>
          <span className="text-purple-300/60 text-sm">
            {track.likeCount.toLocaleString()} likes
          </span>
          {track.durationSeconds && (
            <span className="text-purple-300/60 text-sm">
              {formatDuration(track.durationSeconds)}
            </span>
          )}
          {track.explicit && (
            <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>
              E
            </span>
          )}
        </div>

        {/* Play controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayToggle}
            aria-label={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-6 h-6 text-white fill-white" aria-hidden="true" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white" aria-hidden="true" />
            )}
          </button>
          <button aria-label="Like track" className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <Heart size={18} className="text-purple-400/60" aria-hidden="true" />
          </button>
        </div>

        {/* Description */}
        {track.processingError && (
          <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
            {track.processingError}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

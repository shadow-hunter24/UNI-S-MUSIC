'use client';
import { useParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { useArtist } from '@/lib/hooks/useArtist';

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data: artist, isLoading } = useArtist(id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <div className="animate-pulse">
          <div className="h-48 bg-bg-elevated" />
          <div className="px-4 py-6 space-y-4">
            <div className="h-6 bg-bg-elevated rounded w-1/3" />
            <div className="h-4 bg-bg-elevated rounded w-1/4" />
            <div className="grid grid-cols-2 gap-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-bg-elevated rounded-lg p-3">
                  <div className="aspect-square rounded-lg bg-bg-surface mb-2" />
                  <div className="h-3 bg-bg-surface rounded w-3/4 mb-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center pb-20">
        <p className="text-text-secondary">Artist not found.</p>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div
        className="h-48 bg-gradient-to-br from-primary/30 to-accent/10 relative"
        aria-hidden="true"
      />

      <main className="px-4 -mt-8 relative z-10">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-bg-surface border-4 border-bg overflow-hidden mb-3">
          {artist.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artist.imageUrl} alt={artist.stageName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {artist.stageName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Name & verified */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-white">{artist.stageName}</h1>
          {artist.isVerified && (
            <CheckCircle className="w-5 h-5 text-primary" aria-label="Verified artist" />
          )}
        </div>
        <p className="text-text-secondary text-sm mb-4">
          {artist.totalFollowers.toLocaleString()} followers &middot; {artist.totalTracks} tracks
        </p>

        {artist.bio && <p className="text-text-secondary text-sm mb-6 leading-relaxed">{artist.bio}</p>}

        {/* Top Tracks */}
        {'topTracks' in artist && Array.isArray((artist as { topTracks?: unknown[] }).topTracks) && (
          <section aria-label="Top Tracks" className="mb-8">
            <h2 className="text-white font-semibold mb-3">Top Tracks</h2>
            <div className="grid grid-cols-2 gap-3">
              {((artist as { topTracks: Parameters<typeof TrackCard>[0][] }).topTracks ?? []).map((track) => (
                <TrackCard
                  key={track.id}
                  id={track.id}
                  title={track.title}
                  artistName={artist.stageName}
                  coverImageUrl={track.coverImageUrl}
                  playCount={track.playCount}
                  likeCount={track.likeCount}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

'use client';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { MiniPlayer } from '@/components/music/MiniPlayer';
import { useFeed } from '@/lib/hooks/useFeed';

function SkeletonTrackCard() {
  return (
    <div className="bg-bg-elevated rounded-lg p-3 animate-pulse" aria-hidden="true">
      <div className="aspect-square rounded-lg bg-bg-surface mb-2" />
      <div className="h-3 bg-bg-surface rounded w-3/4 mb-1.5" />
      <div className="h-2.5 bg-bg-surface rounded w-1/2" />
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useFeed();

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6 space-y-8">
        <h1 className="text-2xl font-bold text-white">Home</h1>

        {/* Trending Now */}
        <section aria-label="Trending Now">
          <h2 className="text-white font-semibold mb-3">Trending Now</h2>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-36 shrink-0">
                  <SkeletonTrackCard />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {(data?.trending ?? []).map((track) => (
                <div key={track.id} className="w-36 shrink-0">
                  <TrackCard
                    id={track.id}
                    title={track.title}
                    artistName={track.artistName}
                    coverImageUrl={track.coverImageUrl}
                    playCount={track.playCount}
                    likeCount={track.likeCount}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* New Releases */}
        <section aria-label="New Releases">
          <h2 className="text-white font-semibold mb-3">New Releases</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonTrackCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(data?.newReleases ?? []).slice(0, 6).map((track) => (
                <TrackCard
                  key={track.id}
                  id={track.id}
                  title={track.title}
                  artistName={track.artistName}
                  coverImageUrl={track.coverImageUrl}
                  playCount={track.playCount}
                  likeCount={track.likeCount}
                />
              ))}
            </div>
          )}
        </section>

        {/* From Artists You Follow */}
        {data?.fromFollowing && data.fromFollowing.length > 0 && (
          <section aria-label="From Artists You Follow">
            <h2 className="text-white font-semibold mb-3">From Artists You Follow</h2>
            <div className="grid grid-cols-2 gap-3">
              {data.fromFollowing.map((track) => (
                <TrackCard
                  key={track.id}
                  id={track.id}
                  title={track.title}
                  artistName={track.artistName}
                  coverImageUrl={track.coverImageUrl}
                  playCount={track.playCount}
                  likeCount={track.likeCount}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

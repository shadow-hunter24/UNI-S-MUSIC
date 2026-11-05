'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { TrackDto } from '@unis-music/contracts';

interface GenrePage {
  genre: { id: string; name: string; slug: string; trackCount: number };
  tracks: TrackDto[];
  nextCursor?: string;
}

export default function GenrePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? '';

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['genre', slug],
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      const url = `/api/v1/genres/${slug}${pageParam ? `?cursor=${pageParam}` : ''}`;
      return apiFetch<GenrePage>(url);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!slug,
  });

  // Flatten all pages into a single track list — avoids duplicate-first-page
  // issue that arises when using manual state accumulation with useQuery.
  const tracks = data?.pages.flatMap((page) => page.tracks) ?? [];
  const genreMeta = data?.pages[0]?.genre;

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-elevated rounded w-1/2" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-bg-elevated rounded-lg p-3">
                  <div className="aspect-square rounded-lg bg-bg-surface mb-2" />
                  <div className="h-3 bg-bg-surface rounded w-3/4 mb-1.5" />
                  <div className="h-2.5 bg-bg-surface rounded w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white">{genreMeta?.name ?? slug}</h1>
              <p className="text-text-secondary text-sm">{genreMeta?.trackCount ?? 0} tracks</p>
            </div>

            {tracks.length === 0 ? (
              <p className="text-text-secondary text-center mt-12">No tracks in this genre yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {tracks.map((track) => (
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

            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => void fetchNextPage()}
                  loading={isFetchingNextPage}
                  disabled={isFetchingNextPage}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

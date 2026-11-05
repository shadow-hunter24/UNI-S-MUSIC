'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [cursor, setCursor] = useState<string | undefined>();
  const [allTracks, setAllTracks] = useState<TrackDto[]>([]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['genre', slug, cursor],
    queryFn: async () => {
      const url = `/api/v1/genres/${slug}${cursor ? `?cursor=${cursor}` : ''}`;
      const result = await apiFetch<GenrePage>(url);
      if (cursor) {
        setAllTracks((prev) => [...prev, ...result.tracks]);
      } else {
        setAllTracks(result.tracks);
      }
      return result;
    },
    enabled: !!slug,
  });

  function loadMore() {
    if (data?.nextCursor) {
      setCursor(data.nextCursor);
    }
  }

  const tracks = cursor ? allTracks : (data?.tracks ?? []);

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6">
        {isLoading && !cursor ? (
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
              <h1 className="text-2xl font-bold text-white">{data?.genre.name ?? slug}</h1>
              <p className="text-text-secondary text-sm">{data?.genre.trackCount ?? 0} tracks</p>
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

            {data?.nextCursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  loading={isFetching}
                  disabled={isFetching}
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

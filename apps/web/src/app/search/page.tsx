'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BottomNav } from '@/components/layout/BottomNav';
import { Input } from '@/components/ui/Input';
import { TrackCard } from '@/components/music/TrackCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { apiFetch } from '@/lib/api';
import type { SearchResultDto } from '@unis-music/contracts';

type Tab = 'all' | 'tracks' | 'artists' | 'genres';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => apiFetch<SearchResultDto>(`/api/v1/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'artists', label: 'Artists' },
    { key: 'genres', label: 'Genres' },
  ];

  const showTracks = tab === 'all' || tab === 'tracks';
  const showArtists = tab === 'all' || tab === 'artists';
  const showGenres = tab === 'all' || tab === 'genres';

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-white">Search</h1>

        <Input
          placeholder="Search tracks, artists, genres..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search query"
        />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-bg-elevated" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 px-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-t ${
                tab === t.key
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {!query && (
          <p className="text-text-secondary text-center mt-12">
            Search for tracks, artists or genres
          </p>
        )}

        {/* Loading */}
        {isLoading && debouncedQuery.length >= 2 && (
          <p className="text-text-secondary text-center mt-8">Searching...</p>
        )}

        {/* No results */}
        {data && !isLoading && query && (
          <>
            {data.tracks.length === 0 && data.artists.length === 0 && data.genres.length === 0 && (
              <p className="text-text-secondary text-center mt-12">
                No results for &apos;{query}&apos;
              </p>
            )}

            {/* Tracks */}
            {showTracks && data.tracks.length > 0 && (
              <section aria-label="Track results">
                {tab === 'all' && <h2 className="text-white font-semibold mb-3">Tracks</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {data.tracks.map((track) => (
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

            {/* Artists */}
            {showArtists && data.artists.length > 0 && (
              <section aria-label="Artist results">
                {tab === 'all' && <h2 className="text-white font-semibold mb-3">Artists</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {data.artists.map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      id={artist.id}
                      stageName={artist.stageName}
                      imageUrl={artist.imageUrl}
                      totalFollowers={artist.totalFollowers}
                      isVerified={artist.isVerified}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Genres */}
            {showGenres && data.genres.length > 0 && (
              <section aria-label="Genre results">
                {tab === 'all' && <h2 className="text-white font-semibold mb-3">Genres</h2>}
                <div className="flex flex-wrap gap-2">
                  {data.genres.map((genre) => (
                    <a
                      key={genre.id}
                      href={`/genre/${genre.slug}`}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
                    >
                      {genre.name}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

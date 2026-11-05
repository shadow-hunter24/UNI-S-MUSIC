'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { ArtistCard } from '@/components/music/ArtistCard';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { apiFetch } from '@/lib/api';
import type { SearchResultDto } from '@unis-music/contracts';

type Tab = 'all' | 'tracks' | 'artists' | 'genres';
const TRENDING = ['Burna Boy','Afrobeats','Sarkodie','Wizkid','Amapiano','Gospel Hits'];

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
    { key: 'all', label: 'Top' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'artists', label: 'Artists' },
    { key: 'genres', label: 'Genres' },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-3" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-white">Search</h1>
        </div>
        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/60 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search artists, songs, albums…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search query"
            className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none transition-all"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.25)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
        {/* Tabs */}
        {query.length >= 2 && (
          <div className="flex gap-1 mt-3" role="tablist">
            {tabs.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: tab === t.key ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)', color: tab === t.key ? 'white' : '#c4b5d4', border: tab === t.key ? 'none' : '1px solid rgba(168,85,247,0.2)' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Empty state */}
        {!query && (
          <div>
            <div className="flex flex-col items-center py-10">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)' }}>
                <Search size={28} className="text-purple-400/60" aria-hidden="true" />
              </div>
              <p className="text-purple-300/60 text-sm">Search artists, songs, albums…</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-accent" aria-hidden="true" />
                <h2 className="text-white font-semibold text-sm">Trending Searches</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map((t) => (
                  <button key={t} onClick={() => setQuery(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:scale-105"
                    style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(168,85,247,0.25)', color: '#c4b5d4' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && <p className="text-purple-300/60 text-center text-sm pt-8">Searching…</p>}

        {data && !isLoading && (
          <>
            {data.tracks.length === 0 && data.artists.length === 0 && data.genres.length === 0 && (
              <p className="text-purple-300/60 text-center text-sm pt-8">No results for &ldquo;{query}&rdquo;</p>
            )}

            {(tab === 'all' || tab === 'tracks') && data.tracks.length > 0 && (
              <section aria-label="Tracks">
                {tab === 'all' && <h2 className="text-white font-bold text-sm mb-3">Tracks</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {data.tracks.map((track) => (
                    <TrackCard key={track.id} id={track.id} title={track.title} artistName={track.artistName} coverImageUrl={track.coverImageUrl} playCount={track.playCount} likeCount={track.likeCount} />
                  ))}
                </div>
              </section>
            )}

            {(tab === 'all' || tab === 'artists') && data.artists.length > 0 && (
              <section aria-label="Artists">
                {tab === 'all' && <h2 className="text-white font-bold text-sm mb-3">Artists</h2>}
                <div className="grid grid-cols-2 gap-3">
                  {data.artists.map((a) => (
                    <ArtistCard key={a.id} id={a.id} stageName={a.stageName} imageUrl={a.imageUrl} totalFollowers={a.totalFollowers} isVerified={a.isVerified} />
                  ))}
                </div>
              </section>
            )}

            {(tab === 'all' || tab === 'genres') && data.genres.length > 0 && (
              <section aria-label="Genres">
                {tab === 'all' && <h2 className="text-white font-bold text-sm mb-3">Genres</h2>}
                <div className="flex flex-wrap gap-2">
                  {data.genres.map((g) => (
                    <Link key={g.id} href={`/genre/${g.slug}`}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.2))', border: '1px solid rgba(168,85,247,0.3)', color: 'white' }}>
                      {g.name}
                    </Link>
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

'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BottomNav } from '@/components/layout/BottomNav';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { Button } from '@/components/ui/Button';
import { apiFetch } from '@/lib/api';
import type { PlaylistDto } from '@unis-music/contracts';

type Tab = 'playlists' | 'liked' | 'following';

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('playlists');

  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists', 'me'],
    queryFn: () => apiFetch<PlaylistDto[]>('/api/v1/playlists/me'),
    enabled: tab === 'playlists',
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'playlists', label: 'Playlists' },
    { key: 'liked', label: 'Liked Tracks' },
    { key: 'following', label: 'Following' },
  ];

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-white">Library</h1>
          {tab === 'playlists' && (
            <a href="/playlists/new">
              <Button size="sm" aria-label="New playlist">
                <Plus className="w-4 h-4" aria-hidden="true" />
                New
              </Button>
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-bg-elevated mb-5" role="tablist">
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

        {/* Playlists */}
        {tab === 'playlists' && (
          <div className="space-y-2">
            {isLoading && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg animate-pulse">
                  <div className="w-12 h-12 rounded-md bg-bg-surface shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-bg-surface rounded w-3/4" />
                    <div className="h-2.5 bg-bg-surface rounded w-1/4" />
                  </div>
                </div>
              ))
            )}
            {!isLoading && playlists?.length === 0 && (
              <div className="text-center mt-12">
                <p className="text-text-secondary mb-4">No playlists yet</p>
                <a href="/playlists/new">
                  <Button size="sm">Create your first playlist</Button>
                </a>
              </div>
            )}
            {!isLoading && playlists?.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                id={playlist.id}
                title={playlist.title}
                trackCount={playlist.trackCount}
                coverImageUrl={playlist.coverImageUrl}
                isPublic={playlist.isPublic}
              />
            ))}
          </div>
        )}

        {tab === 'liked' && (
          <p className="text-text-secondary text-center mt-12">Liked tracks coming soon.</p>
        )}

        {tab === 'following' && (
          <p className="text-text-secondary text-center mt-12">Following list coming soon.</p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

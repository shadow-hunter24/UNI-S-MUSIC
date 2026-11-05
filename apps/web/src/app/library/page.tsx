'use client';
import { useState } from 'react';
import { Plus, Music, Heart, Users } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BottomNav } from '@/components/layout/BottomNav';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { apiFetch } from '@/lib/api';
import type { PlaylistDto } from '@unis-music/contracts';

type Tab = 'playlists' | 'liked' | 'following';

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('playlists');
  const { data: playlists, isLoading } = useQuery({
    queryKey: ['playlists','me'],
    queryFn: () => apiFetch<PlaylistDto[]>('/api/v1/playlists/me'),
    enabled: tab === 'playlists',
  });

  const tabs = [
    { key: 'playlists' as Tab, label: 'Playlists', icon: Music },
    { key: 'liked' as Tab, label: 'Liked', icon: Heart },
    { key: 'following' as Tab, label: 'Following', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="sticky top-0 z-20 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Library</h1>
          {tab === 'playlists' && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 10px rgba(124,58,237,0.4)' }} aria-label="New playlist">
              <Plus size={14} aria-hidden="true" /> New
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: tab === key ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.1)', color: tab === key ? 'white' : 'rgba(196,181,212,0.7)', border: tab === key ? 'none' : '1px solid rgba(168,85,247,0.2)' }}>
              <Icon size={12} aria-hidden="true" />{label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        {tab === 'playlists' && (
          <div className="space-y-3">
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse" style={{ background: 'rgba(124,58,237,0.1)' }}>
                <div className="w-12 h-12 rounded-lg shrink-0" style={{ background: 'rgba(124,58,237,0.2)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded w-3/4" style={{ background: 'rgba(124,58,237,0.2)' }} />
                  <div className="h-2.5 rounded w-1/4" style={{ background: 'rgba(124,58,237,0.15)' }} />
                </div>
              </div>
            ))}
            {!isLoading && !playlists?.length && (
              <div className="flex flex-col items-center py-16">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Music size={28} className="text-purple-400/50" aria-hidden="true" />
                </div>
                <p className="text-sm mb-4" style={{ color: 'rgba(196,181,212,0.6)' }}>No playlists yet</p>
                <button className="px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>
                  Create your first playlist
                </button>
              </div>
            )}
            {playlists?.map((p) => <PlaylistCard key={p.id} id={p.id} title={p.title} trackCount={p.trackCount} coverImageUrl={p.coverImageUrl} isPublic={p.isPublic} />)}
          </div>
        )}

        {tab === 'liked' && (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <Heart size={28} className="text-purple-400/50" aria-hidden="true" />
            </div>
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.6)' }}>Your liked tracks will appear here.</p>
          </div>
        )}

        {tab === 'following' && (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <Users size={28} className="text-purple-400/50" aria-hidden="true" />
            </div>
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.6)' }}>Artists you follow will appear here.</p>
            <Link href="/browse" className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>
              Discover Artists
            </Link>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

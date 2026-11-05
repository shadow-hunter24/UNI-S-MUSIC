'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, MessageCircle, Music } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { useArtist } from '@/lib/hooks/useArtist';
import { apiFetch } from '@/lib/api';

type Tab = 'top' | 'albums' | 'about';

export default function ArtistPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { data: artist, isLoading } = useArtist(id);
  const [tab, setTab] = useState<Tab>('top');
  const [following, setFollowing] = useState(false);

  async function toggleFollow() {
    try {
      await apiFetch(`/api/v1/artists/${id}/follow`, { method: following ? 'DELETE' : 'POST' });
      setFollowing(!following);
    } catch { /* silent */ }
  }

  const bgStyle = { background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' };

  if (isLoading) return (
    <div className="min-h-screen pb-20" style={bgStyle}>
      <div className="animate-pulse">
        <div className="h-48" style={{ background: 'rgba(124,58,237,0.2)' }} />
        <div className="px-4 py-5 space-y-4">
          <div className="h-6 rounded w-1/3" style={{ background: 'rgba(124,58,237,0.2)' }} />
          <div className="h-4 rounded w-1/4" style={{ background: 'rgba(124,58,237,0.15)' }} />
        </div>
      </div>
      <BottomNav />
    </div>
  );

  if (!artist) return (
    <div className="min-h-screen flex items-center justify-center pb-20" style={bgStyle}>
      <p className="text-purple-300/60">Artist not found.</p>
      <BottomNav />
    </div>
  );

  const topTracks = (artist as unknown as { topTracks?: Parameters<typeof TrackCard>[0][] }).topTracks ?? [];

  return (
    <div className="min-h-screen flex flex-col pb-20" style={bgStyle}>
      {/* Header image */}
      <div className="relative h-52" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(168,85,247,0.3),rgba(13,1,33,0.8))' }}>
        <Link href="/home" className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center z-10" style={{ background: 'rgba(13,1,33,0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(168,85,247,0.3)' }} aria-label="Back">
          <ArrowLeft size={18} className="text-white" />
        </Link>
        {/* Purple glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(168,85,247,0.4) 0%,transparent 70%)', filter: 'blur(20px)' }} aria-hidden="true" />
      </div>

      <main className="flex-1 px-4 -mt-12 relative z-10">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.5),rgba(168,85,247,0.3))', boxShadow: '0 0 0 3px rgba(168,85,247,0.4), 0 0 25px rgba(124,58,237,0.4)', border: '3px solid #0d0121' }}>
          {artist.imageUrl
            ? <img src={artist.imageUrl} alt={artist.stageName} className="w-full h-full object-cover" />
            : <span className="text-3xl font-black text-purple-300">{artist.stageName.slice(0, 2).toUpperCase()}</span>
          }
        </div>

        {/* Name */}
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-black text-white">{artist.stageName}</h1>
          {artist.isVerified && <CheckCircle className="w-5 h-5 text-accent" aria-label="Verified" />}
        </div>
        <p className="text-sm mb-5" style={{ color: 'rgba(196,181,212,0.6)' }}>
          {artist.totalFollowers.toLocaleString()} Followers &middot; {artist.totalTracks} Tracks
        </p>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button onClick={toggleFollow}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-105"
            style={following
              ? { border: '1px solid rgba(168,85,247,0.5)', color: '#a855f7', background: 'transparent' }
              : { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>
            {following ? 'Following' : 'Follow'}
          </button>
          <button className="flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-105" style={{ border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
            <MessageCircle size={15} aria-hidden="true" /> Message
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-5" style={{ borderColor: 'rgba(168,85,247,0.2)' }} role="tablist">
          {(['top','albums','about'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className="pb-3 text-sm font-semibold capitalize transition-all"
              style={{ color: tab === t ? '#a855f7' : 'rgba(196,181,212,0.5)', borderBottom: tab === t ? '2px solid #a855f7' : '2px solid transparent', marginBottom: '-1px' }}>
              {t === 'top' ? 'Top Tracks' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'top' && (
          <div className="grid grid-cols-2 gap-3">
            {topTracks.length === 0
              ? <p className="col-span-2 text-center py-8 text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>No tracks yet.</p>
              : topTracks.map((track) => (
                <TrackCard key={track.id} id={track.id} title={track.title} artistName={artist.stageName} coverImageUrl={track.coverImageUrl} playCount={track.playCount} likeCount={track.likeCount} />
              ))
            }
          </div>
        )}

        {tab === 'albums' && (
          <div className="flex flex-col items-center py-12">
            <Music size={40} className="text-purple-400/30 mb-3" aria-hidden="true" />
            <p className="text-sm" style={{ color: 'rgba(196,181,212,0.5)' }}>Albums coming in Phase 4.</p>
          </div>
        )}

        {tab === 'about' && artist.bio && (
          <p className="text-sm leading-relaxed" style={{ color: '#c4b5d4' }}>{artist.bio}</p>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

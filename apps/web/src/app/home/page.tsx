'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, Search, User } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { TrackCard } from '@/components/music/TrackCard';
import { MiniPlayer } from '@/components/music/MiniPlayer';
import { useFeed } from '@/lib/hooks/useFeed';

const GENRES = ['Afrobeats','Hip Hop','Gospel','R&B','Reggae','Electronic','Rock','Country'];

function SkeletonCard() {
  return (
    <div className="rounded-xl p-3 animate-pulse shrink-0" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}>
      <div className="aspect-square rounded-lg mb-2" style={{ background: 'rgba(124,58,237,0.15)' }} />
      <div className="h-3 rounded w-3/4 mb-1.5" style={{ background: 'rgba(124,58,237,0.15)' }} />
      <div className="h-2.5 rounded w-1/2" style={{ background: 'rgba(124,58,237,0.1)' }} />
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading } = useFeed();

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span className="font-black text-base" style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s Music</span>
        </div>
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="text-purple-300/60 hover:text-purple-300 transition-colors">
            <Bell size={20} />
          </button>
          <Link href="/profile" aria-label="Profile" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <User size={15} className="text-purple-300" />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 space-y-7">

        {/* Search bar */}
        <Link href="/search" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:border-purple-500/50" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <Search size={16} className="text-purple-400/60" aria-hidden="true" />
          <span className="text-sm text-purple-400/50">Search artists, songs, albums…</span>
        </Link>

        {/* Featured hero banner */}
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 200 }}>
          <Image
            src="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80"
            alt="Featured track"
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw, 640px"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(13,1,33,0.85) 0%, rgba(13,1,33,0.3) 60%, transparent 100%)' }} />
          <div className="absolute inset-0 p-5 flex flex-col justify-end">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-widest mb-1">Trending Now</span>
            <h2 className="text-xl font-black text-white mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>Play Now</h2>
            <p className="text-sm text-purple-200/80">Discover today&apos;s hottest tracks</p>
          </div>
        </div>

        {/* Trending Now */}
        <section aria-label="Trending Now">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">Trending Now</h2>
            <Link href="/search" className="text-xs text-accent hover:text-purple-300">View All</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-36 shrink-0"><SkeletonCard /></div>)
              : (data?.trending ?? []).map((track) => (
                <div key={track.id} className="w-36 shrink-0">
                  <TrackCard id={track.id} title={track.title} artistName={track.artistName} coverImageUrl={track.coverImageUrl} playCount={track.playCount} likeCount={track.likeCount} />
                </div>
              ))
            }
          </div>
        </section>

        {/* Genre chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {GENRES.map((g) => (
            <Link key={g} href={`/genre/${g.toLowerCase().replace(/ /g, '-').replace(/&/g, '')}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: '#c4b5d4' }}>
              {g}
            </Link>
          ))}
        </div>

        {/* New Releases */}
        <section aria-label="New Releases">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">New Releases</h2>
            <Link href="/browse" className="text-xs text-accent hover:text-purple-300">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : (data?.newReleases ?? []).slice(0, 6).map((track) => (
                <TrackCard key={track.id} id={track.id} title={track.title} artistName={track.artistName} coverImageUrl={track.coverImageUrl} playCount={track.playCount} likeCount={track.likeCount} />
              ))
            }
          </div>
        </section>

        {/* From Artists You Follow */}
        {data?.fromFollowing && data.fromFollowing.length > 0 && (
          <section aria-label="From Artists You Follow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-base">From Artists You Follow</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.fromFollowing.map((track) => (
                <TrackCard key={track.id} id={track.id} title={track.title} artistName={track.artistName} coverImageUrl={track.coverImageUrl} playCount={track.playCount} likeCount={track.likeCount} />
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

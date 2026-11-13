'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, Music2, Heart, ListMusic, UserCheck, Edit2, LogOut } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { MiniPlayer } from '@/components/music/MiniPlayer';

const MOCK_USER = {
  name: 'Alex Johnson',
  username: '@alexjohnson',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
  bio: 'Music lover. Afrobeats enthusiast. Supporting African artists worldwide 🎵',
  followers: 1240,
  following: 380,
  totalLikes: 4820,
};

const LIKED_TRACKS = [
  { title: 'Last Last',         artist: 'Burna Boy',          cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&q=80', duration: '3:24' },
  { title: 'Essence',           artist: 'Wizkid ft. Tems',    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&q=80', duration: '4:01' },
  { title: 'Ye',                artist: 'Burna Boy',          cover: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=100&q=80', duration: '2:58' },
  { title: 'Wonderful',         artist: 'Burna Boy',          cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&q=80', duration: '3:45' },
];

const PLAYLISTS = [
  { title: 'Afrobeats Vibes',  tracks: 24, cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=200&q=80' },
  { title: 'Late Night Mood',  tracks: 18, cover: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=200&q=80' },
  { title: 'Workout Hits',     tracks: 31, cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80' },
];

type Tab = 'likes' | 'playlists';

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('likes');

  return (
    <div className="min-h-screen flex flex-col pb-32" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(13,1,33,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <h1 className="text-white font-bold text-base">Profile</h1>
        <Link href="/profile/settings" aria-label="Settings" className="text-purple-300/60 hover:text-purple-300 transition-colors">
          <Settings size={20} />
        </Link>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">

        {/* ── Profile card ───────────────────────────────────── */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden" style={{ border: '3px solid rgba(168,85,247,0.6)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>
                <Image src={MOCK_USER.avatar} alt={MOCK_USER.name} width={80} height={80} className="object-cover w-full h-full" />
              </div>
              <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d0121]" style={{ background: '#22c55e' }} aria-label="Online" />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-black text-lg truncate">{MOCK_USER.name}</h2>
              <p className="text-sm text-purple-300/70 mb-2">{MOCK_USER.username}</p>
              <p className="text-xs text-purple-200/70 leading-relaxed">{MOCK_USER.bio}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { label: 'Followers', value: MOCK_USER.followers.toLocaleString() },
              { label: 'Following', value: MOCK_USER.following.toLocaleString() },
              { label: 'Likes',     value: MOCK_USER.totalLikes.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <p className="text-white font-black text-lg leading-none">{value}</p>
                <p className="text-xs text-purple-300/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4">
            <Link href="/profile/edit" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}>
              <Edit2 size={14} /> Edit Profile
            </Link>
            <Link href="/artist/verification" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-purple-300 hover:text-white transition-colors"
              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
              <UserCheck size={14} /> Get Verified
            </Link>
          </div>
        </div>

        {/* ── Quick links ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Music2,    label: 'My Music',     href: '/artist/dashboard', color: '#7c3aed' },
            { icon: Heart,     label: 'Liked Tracks', href: '#',                 color: '#ec4899' },
            { icon: ListMusic, label: 'Playlists',    href: '/playlists',        color: '#a855f7' },
            { icon: LogOut,    label: 'Log Out',      href: '/auth/logout',      color: '#ef4444' },
          ].map(({ icon: Icon, label, href, color }) => (
            <Link key={label} href={href} className="flex items-center gap-3 p-4 rounded-xl hover:scale-[1.02] transition-transform"
              style={{ background: 'rgba(42,13,74,0.6)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}22` }}>
                <Icon size={18} style={{ color }} aria-hidden="true" />
              </div>
              <span className="text-sm font-medium text-white">{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <section>
          <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: 'rgba(42,13,74,0.5)', border: '1px solid rgba(168,85,247,0.15)' }}>
            {(['likes', 'playlists'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' }
                  : { color: 'rgba(196,181,212,0.6)' }}>
                {t === 'likes' ? 'Liked Tracks' : 'Playlists'}
              </button>
            ))}
          </div>

          {tab === 'likes' && (
            <div className="space-y-2">
              {LIKED_TRACKS.map((track, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(42,13,74,0.5)', border: '1px solid rgba(168,85,247,0.1)' }}>
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0">
                    <Image src={track.cover} alt={track.title} fill className="object-cover" sizes="44px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                    <p className="text-xs text-purple-300/60 truncate">{track.artist}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-purple-300/50">{track.duration}</span>
                    <Heart size={14} className="text-pink-500 fill-pink-500" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'playlists' && (
            <div className="grid grid-cols-2 gap-3">
              {PLAYLISTS.map((pl, i) => (
                <Link key={i} href="/playlists" className="rounded-xl overflow-hidden hover:scale-[1.02] transition-transform"
                  style={{ border: '1px solid rgba(168,85,247,0.2)' }}>
                  <div className="relative aspect-square">
                    <Image src={pl.cover} alt={pl.title} fill className="object-cover" sizes="(max-width:640px) 50vw, 25vw" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 50%,rgba(13,1,33,0.9) 100%)' }} />
                  </div>
                  <div className="p-2.5" style={{ background: 'rgba(26,5,51,0.95)' }}>
                    <p className="text-xs font-semibold text-white truncate">{pl.title}</p>
                    <p className="text-xs text-purple-300/60">{pl.tracks} tracks</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

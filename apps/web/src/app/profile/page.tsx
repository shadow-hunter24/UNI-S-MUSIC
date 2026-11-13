'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, Music2, Heart, ListMusic, UserCheck, Edit2, LogOut, User, ShieldCheck, Mic2 } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { MiniPlayer } from '@/components/music/MiniPlayer';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useMyTracks } from '@/lib/hooks/useTracks';
import { useArtistMe } from '@/lib/hooks/useArtist';

type Tab = 'tracks' | 'playlists';

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg ${className ?? ''}`} style={{ background: 'rgba(124,58,237,0.15)' }} />;
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('tracks');
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: tracksData, isLoading: tracksLoading } = useMyTracks();
  const { data: artistProfile } = useArtistMe();

  const tracks = tracksData?.items ?? [];
  const initials = user
    ? (user.fullName ?? user.username ?? 'U').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen flex flex-col pb-36" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

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
              <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: '3px solid rgba(168,85,247,0.6)', boxShadow: '0 0 20px rgba(124,58,237,0.4)', background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                {user?.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.fullName ?? user.username ?? 'User'} width={80} height={80} className="object-cover w-full h-full" />
                ) : userLoading ? (
                  <div className="w-full h-full animate-pulse" style={{ background: 'rgba(168,85,247,0.3)' }} />
                ) : (
                  <span className="text-white font-black text-2xl select-none">{initials}</span>
                )}
              </div>
              {/* Online dot */}
              <div className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d0121]" style={{ background: '#22c55e' }} aria-label="Online" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {userLoading ? (
                <>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3.5 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </>
              ) : (
                <>
                  <h2 className="text-white font-black text-lg truncate">
                    {user?.fullName ?? user?.username ?? 'Unknown User'}
                  </h2>
                  <p className="text-sm text-purple-300/70 mb-1">@{user?.username ?? '—'}</p>
                  <p className="text-xs text-purple-200/70 leading-relaxed">
                    {user?.bio ?? 'No bio yet.'}
                  </p>
                  <span className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                    style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(168,85,247,0.3)', color: '#c4b5d4' }}>
                    {user?.role?.toLowerCase() ?? 'listener'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { label: 'Tracks',  value: tracksLoading ? '…' : String(tracks.length) },
              { label: 'Role',    value: userLoading ? '…' : (user?.role?.toLowerCase() ?? '—') },
              { label: 'Status',  value: userLoading ? '…' : (user?.emailVerified ? 'Verified' : 'Unverified') },
            ].map(({ label, value }) => (
              <div key={label} className="text-center py-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <p className="text-white font-black text-base leading-none truncate px-1">{value}</p>
                <p className="text-xs text-purple-300/60 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <Link href="/profile/edit" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.3)' }}>
              <Edit2 size={14} /> Edit Profile
            </Link>
            {/* Role-based CTA */}
            {!userLoading && user?.role !== 'ARTIST' && (
              <Link href="/artist/apply" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-purple-300 hover:text-white transition-colors"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                <Mic2 size={14} /> Become an Artist
              </Link>
            )}
            {!userLoading && user?.role === 'ARTIST' && !artistProfile?.isVerified && (
              <Link href="/artist/verification" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-purple-300 hover:text-white transition-colors"
                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                <UserCheck size={14} /> Get Verified
              </Link>
            )}
            {!userLoading && user?.role === 'ARTIST' && artistProfile?.isVerified && (
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(168,85,247,0.15))', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>
                <ShieldCheck size={14} /> Verified Artist
              </div>
            )}
          </div>
        </div>

        {/* ── Account info card ──────────────────────────────── */}
        {!userLoading && user && (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(42,13,74,0.5)', border: '1px solid rgba(168,85,247,0.15)' }}>
            <h3 className="text-xs font-semibold text-purple-300/60 uppercase tracking-widest">Account Details</h3>
            {[
              { icon: User, label: 'Email', value: user.email },
              { icon: User, label: 'Username', value: `@${user.username}` },
              { icon: User, label: 'Member since', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-purple-300/60">{label}</span>
                <span className="text-sm text-white font-medium truncate max-w-[180px] text-right">{value}</span>
              </div>
            ))}
          </div>
        )}

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

        {/* ── Tabs — My Tracks / Playlists ───────────────────── */}
        <section>
          <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: 'rgba(42,13,74,0.5)', border: '1px solid rgba(168,85,247,0.15)' }}>
            {(['tracks', 'playlists'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all"
                style={tab === t
                  ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff' }
                  : { color: 'rgba(196,181,212,0.6)' }}>
                {t === 'tracks' ? 'My Tracks' : 'Playlists'}
              </button>
            ))}
          </div>

          {tab === 'tracks' && (
            <div className="space-y-2">
              {tracksLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(42,13,74,0.5)' }}>
                      <Skeleton className="w-11 h-11 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))
                : tracks.length === 0
                  ? (
                    <div className="text-center py-10">
                      <Music2 size={32} className="text-purple-400/30 mx-auto mb-2" />
                      <p className="text-sm text-purple-300/50">No tracks yet.</p>
                      <Link href="/artist/upload" className="mt-3 inline-block text-xs text-purple-400 hover:text-purple-300 underline">Upload your first track</Link>
                    </div>
                  )
                  : tracks.map((track) => (
                    <div key={track.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'rgba(42,13,74,0.5)', border: '1px solid rgba(168,85,247,0.1)' }}>
                      {/* Cover */}
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}>
                        {track.coverImageUrl ? (
                          <Image src={track.coverImageUrl} alt={track.title} fill className="object-cover" sizes="44px" />
                        ) : (
                          <Music2 size={16} className="text-purple-400/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{track.title}</p>
                        <p className="text-xs text-purple-300/60 capitalize">{track.status?.toLowerCase().replace('_', ' ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-purple-300/50">{track.playCount ?? 0} plays</p>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {tab === 'playlists' && (
            <div className="text-center py-10">
              <ListMusic size={32} className="text-purple-400/30 mx-auto mb-2" />
              <p className="text-sm text-purple-300/50">No playlists yet.</p>
              <Link href="/playlists/new" className="mt-3 inline-block text-xs text-purple-400 hover:text-purple-300 underline">Create a playlist</Link>
            </div>
          )}
        </section>

      </main>

      <MiniPlayer />
      <BottomNav />
    </div>
  );
}

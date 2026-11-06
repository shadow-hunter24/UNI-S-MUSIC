'use client';
import Link from 'next/link';
import {
  Upload, Music, DollarSign, Users, TrendingUp,
  Home, Settings, Megaphone, MessageCircle, Play,
} from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const STATS = [
  { label: 'Total Streams', value: '125,482', icon: TrendingUp, color: '#a855f7' },
  { label: 'Monthly', value: '48,210', icon: Play, color: '#ec4899' },
  { label: 'Followers', value: '12.4K', icon: Users, color: '#7c3aed' },
  { label: 'Earnings', value: '$248.32', icon: DollarSign, color: '#22c55e' },
];

const TOP_TRACKS = [
  { rank: 1, title: 'City Boys', plays: '24,102', earnings: '$48.20' },
  { rank: 2, title: 'Afro Nation', plays: '18,540', earnings: '$37.08' },
  { rank: 3, title: 'Essence Remix', plays: '15,200', earnings: '$30.40' },
  { rank: 4, title: 'Night Vibes', plays: '12,890', earnings: '$25.78' },
  { rank: 5, title: 'Golden Hour', plays: '10,450', earnings: '$20.90' },
];

const RECENT_ACTIVITY = [
  { action: 'New follower', detail: 'BrightBeat started following you', time: '2m ago' },
  { action: 'Track liked', detail: '"City Boys" was liked 120 times today', time: '1h ago' },
  { action: 'Payout', detail: '$48.20 payout processed', time: '3h ago' },
  { action: 'New comment', detail: 'KingDee commented on "Afro Nation"', time: '5h ago' },
];

const SIDEBAR_NAV = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/artist/upload', label: 'My Music', icon: Music },
  { href: '/earn', label: 'Earnings', icon: DollarSign },
  { href: '/earn/payouts', label: 'Payouts', icon: TrendingUp },
  { href: '/earn', label: 'Promotions', icon: Megaphone },
  { href: '/connect', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Settings', icon: Settings },
];

export default function ArtistDashboard() {
  return (
    <div
      className="min-h-screen flex pb-20"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Left sidebar — desktop only */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 py-6 px-3"
        style={{ background: 'rgba(13,1,33,0.85)', borderRight: '1px solid rgba(168,85,247,0.15)', minHeight: '100vh' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 mb-8">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            <span className="text-white font-black text-xs">U</span>
          </div>
          <span
            className="font-black text-base"
            style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Uni&apos;s Music
          </span>
        </div>

        {/* Nav links */}
        <nav aria-label="Artist navigation">
          <ul className="space-y-1" role="list">
            {SIDEBAR_NAV.map(({ href, label, icon: Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-purple-600/10"
                  style={{ color: 'rgba(196,181,212,0.7)' }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="flex items-center justify-between px-4 py-4"
          style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
        >
          <div>
            <h1 className="text-lg font-bold text-white">Artist Dashboard</h1>
            <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>Welcome back, BrightKing</p>
          </div>
          <Link
            href="/artist/upload"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}
          >
            <Upload size={14} aria-hidden="true" />
            Upload
          </Link>
        </header>

        <main className="flex-1 px-4 py-5 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{
                  background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))',
                  border: '1px solid rgba(168,85,247,0.2)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                  style={{ background: `${color}22` }}
                >
                  <Icon size={16} style={{ color }} aria-hidden="true" />
                </div>
                <p className="text-white font-black text-lg leading-none mb-1">{value}</p>
                <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Top Tracks table */}
          <div>
            <h2 className="text-white font-bold text-sm mb-3">Top Tracks</h2>
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              {/* Table header */}
              <div
                className="grid grid-cols-4 px-4 py-2.5 text-xs font-semibold"
                style={{ color: 'rgba(196,181,212,0.5)', borderBottom: '1px solid rgba(168,85,247,0.1)' }}
              >
                <span>#</span>
                <span className="col-span-2">Title</span>
                <span className="text-right">Plays / Earnings</span>
              </div>
              {/* Rows */}
              {TOP_TRACKS.map((track) => (
                <div
                  key={track.rank}
                  className="grid grid-cols-4 items-center px-4 py-3 transition-all hover:bg-purple-600/5"
                  style={{ borderBottom: '1px solid rgba(168,85,247,0.06)' }}
                >
                  <span className="text-xs font-bold" style={{ color: 'rgba(196,181,212,0.4)' }}>{track.rank}</span>
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.15))' }}
                    >
                      <Music size={12} className="text-purple-400/60" aria-hidden="true" />
                    </div>
                    <span className="text-white text-sm font-semibold truncate">{track.title}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-xs font-semibold">{track.plays}</p>
                    <p className="text-xs" style={{ color: '#22c55e' }}>{track.earnings}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-white font-bold text-sm mb-3">Recent Activity</h2>
            <div className="space-y-2">
              {RECENT_ACTIVITY.map((item) => (
                <div
                  key={item.action + item.time}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.12)' }}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: '#a855f7' }}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{item.action}</p>
                    <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>{item.detail}</p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'rgba(196,181,212,0.4)' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>

      <BottomNav />
    </div>
  );
}

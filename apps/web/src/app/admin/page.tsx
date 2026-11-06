'use client';
import Link from 'next/link';
import { Users, Music, DollarSign, TrendingUp, Home, Settings, ShieldCheck, CreditCard } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const STATS = [
  { label: 'Total Users', value: '12,492', icon: Users, color: '#7c3aed' },
  { label: 'Artists', value: '63,204', icon: Music, color: '#a855f7' },
  { label: 'Albums', value: '8.4M', icon: TrendingUp, color: '#ec4899' },
  { label: 'Earnings', value: '$18,924', icon: DollarSign, color: '#22c55e' },
];

const RECENT_USERS = [
  { name: 'Burna Boy', type: 'Artist', status: 'Active' },
  { name: 'Sista', type: 'User', status: 'Pending' },
  { name: 'Rema', type: 'Artist', status: 'Active' },
  { name: 'Oma Lay', type: 'Artist', status: 'Active' },
  { name: 'Ola', type: 'User', status: 'Pending' },
  { name: 'Ann Start', type: 'Artist', status: 'Active' },
];

const RECENT_ACTIVITY = [
  { label: 'New artist registered', detail: 'Burna Boy joined the platform', time: '2m ago' },
  { label: 'Payout approved', detail: 'GH₵ 50.00 paid to BrightBeat', time: '1h ago' },
  { label: 'Verification request', detail: 'Rema applied for verification', time: '3h ago' },
  { label: 'Track published', detail: '"City Boys" is now live', time: '5h ago' },
];

const SIDEBAR_NAV = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/verification', label: 'Verification', icon: ShieldCheck },
  { href: '/admin/accounts', label: 'Accounts', icon: Users },
  { href: '/admin/verification', label: 'Payouts', icon: CreditCard },
  { href: '/profile', label: 'Settings', icon: Settings },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  Pending: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
  Suspended: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

export default function AdminPage() {
  return (
    <div
      className="min-h-screen flex pb-20"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Sidebar — desktop */}
      <aside
        className="hidden md:flex flex-col w-56 shrink-0 py-6 px-3"
        style={{ background: 'rgba(13,1,33,0.85)', borderRight: '1px solid rgba(168,85,247,0.15)', minHeight: '100vh' }}
      >
        <div className="flex items-center gap-2 px-3 mb-8">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            <span className="text-white font-black text-xs">A</span>
          </div>
          <span className="text-white font-bold text-sm">Admin Panel</span>
        </div>
        <nav aria-label="Admin navigation">
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-4"
          style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
        >
          <div>
            <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>Platform Overview</p>
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            <span className="text-white font-black text-xs">A</span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 space-y-6">

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}22` }}>
                  <Icon size={16} style={{ color }} aria-hidden="true" />
                </div>
                <p className="text-white font-black text-lg leading-none mb-1">{value}</p>
                <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Action badges */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/verification"
              className="rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}
            >
              <div>
                <p className="text-white font-bold text-sm">Pending Verification</p>
                <p className="text-xs" style={{ color: 'rgba(234,179,8,0.8)' }}>24 artists waiting</p>
              </div>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24' }}
              >
                24
              </span>
            </Link>
            <Link
              href="/admin/verification"
              className="rounded-xl p-4 flex items-center justify-between transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <div>
                <p className="text-white font-bold text-sm">Payout Approvals</p>
                <p className="text-xs" style={{ color: 'rgba(34,197,94,0.8)' }}>7 requests</p>
              </div>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}
              >
                7
              </span>
            </Link>
          </div>

          {/* Recent Users */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-sm">Recent Users</h2>
              <Link href="/admin/accounts" className="text-xs text-accent hover:text-purple-300 transition-colors">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {RECENT_USERS.map((user) => {
                const s = STATUS_STYLE[user.status] ?? STATUS_STYLE['Pending']!;
                return (
                  <div
                    key={user.name}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.12)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-purple-300 shrink-0"
                      style={{ background: 'rgba(124,58,237,0.25)' }}
                    >
                      {user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: user.type === 'Artist' ? 'rgba(168,85,247,0.15)' : 'rgba(124,58,237,0.1)', color: user.type === 'Artist' ? '#a855f7' : '#c4b5d4' }}
                      >
                        {user.type}
                      </span>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {user.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-white font-bold text-sm mb-3">Recent Activity</h2>
            <div className="space-y-2">
              {RECENT_ACTIVITY.map((item) => (
                <div
                  key={item.label + item.time}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.12)' }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: '#a855f7' }} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{item.label}</p>
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

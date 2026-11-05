'use client';
import { Users, Music, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

const STATS = [
  { label: 'Total Users', value: '12,492', icon: Users, color: '#7c3aed' },
  { label: 'Artists', value: '03,204', icon: Music, color: '#a855f7' },
  { label: 'Total Tracks', value: '8.4M', icon: TrendingUp, color: '#ec4899' },
  { label: 'Total Earnings', value: 'GH₵318,924', icon: DollarSign, color: '#22c55e' },
];

const RECENT = ['Burna Boy', 'Sista', 'Rema', 'Oma', 'Ola', 'Ann Start'];

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div>
          <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
          <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>Platform Overview</p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
          <span className="text-white font-black text-xs">A</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.2)' }}>
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
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)' }}>
            <div>
              <p className="text-white font-bold text-sm">Pending Verification</p>
              <p className="text-xs" style={{ color: 'rgba(234,179,8,0.8)' }}>24 artists waiting</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(234,179,8,0.2)', color: '#fbbf24' }}>Review</button>
          </div>
          <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div>
              <p className="text-white font-bold text-sm">Payout Approvals</p>
              <p className="text-xs" style={{ color: 'rgba(34,197,94,0.8)' }}>7 requests</p>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>Review</button>
          </div>
        </div>

        {/* Recent Users */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Recent Users</h2>
          <div className="space-y-2">
            {RECENT.map((name, i) => (
              <div key={name} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.12)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-purple-300" style={{ background: 'rgba(124,58,237,0.25)' }}>{name[0]}</div>
                  <span className="text-sm text-white">{name}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: i % 3 === 0 ? 'rgba(234,179,8,0.15)' : 'rgba(34,197,94,0.15)', color: i % 3 === 0 ? '#fbbf24' : '#22c55e' }}>
                  {i % 3 === 0 ? 'Pending' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

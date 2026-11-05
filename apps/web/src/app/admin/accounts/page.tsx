'use client';
import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const ACCOUNTS = [
  { name: 'jayobi22', type: 'Artist', status: 'Active', action: 'Suspend' },
  { name: 'OdaMusic', type: 'Artist', status: 'Active', action: 'Suspend' },
  { name: 'Nana', type: 'User', status: 'Pending', action: 'Approve' },
  { name: 'OmaLay', type: 'Artist', status: 'Active', action: 'Suspend' },
  { name: 'Kira_DJ', type: 'Artist', status: 'Pending', action: 'Approve' },
  { name: 'Rachel', type: 'User', status: 'Suspended', action: 'Reinstate' },
  { name: 'Daniel_Chase', type: 'Artist', status: 'Active', action: 'Suspend' },
];

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Active: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
  Pending: { bg: 'rgba(234,179,8,0.15)', color: '#fbbf24' },
  Suspended: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
};

export default function AccountsPage() {
  const [search, setSearch] = useState('');
  const filtered = ACCOUNTS.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="sticky top-0 z-20 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/admin" aria-label="Back" className="text-purple-300/60 hover:text-purple-300"><ArrowLeft size={20} /></Link>
          <h1 className="text-lg font-bold text-white">Account Management</h1>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400/50 pointer-events-none" aria-hidden="true" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts…" className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-purple-400/40 outline-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} aria-label="Search accounts" />
        </div>
      </header>

      <main className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {filtered.map((a) => {
            const s = STATUS_STYLE[a.status] ?? STATUS_STYLE['Pending']!;
            return (
              <div key={a.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))', border: '1px solid rgba(168,85,247,0.15)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-purple-300 shrink-0" style={{ background: 'rgba(124,58,237,0.25)' }}>{a.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{a.name}</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: a.type === 'Artist' ? 'rgba(168,85,247,0.15)' : 'rgba(124,58,237,0.1)', color: a.type === 'Artist' ? '#a855f7' : '#c4b5d4' }}>{a.type}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full shrink-0 font-medium" style={{ background: s.bg, color: s.color }}>{a.status}</span>
                <button className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(124,58,237,0.2)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }}>{a.action}</button>
              </div>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

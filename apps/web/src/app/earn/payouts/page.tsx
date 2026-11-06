'use client';
import { ArrowLeft, Smartphone, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const EARNINGS = [
  { label: 'Today', amount: '$3.20' },
  { label: 'This Week', amount: '$18.40' },
  { label: 'This Month', amount: '$12.40' },
];

export default function PayoutsPage() {
  return (
    <div
      className="min-h-screen flex flex-col pb-24"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/earn" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Payouts</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">

        {/* Balance card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 30px rgba(124,58,237,0.2)',
          }}
        >
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-xs text-purple-300/70 mb-1">Available Balance</p>
              <p className="text-3xl font-black text-white">$24.60</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-300/70 mb-1">Pending Earnings</p>
              <p className="text-xl font-bold text-purple-300">$12.40</p>
            </div>
          </div>
          <button
            className="w-full py-2.5 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            Withdraw
          </button>
        </div>

        {/* Earnings Overview */}
        <div>
          <h2 className="text-white font-bold text-sm mb-3">Earnings Overview</h2>
          <div className="grid grid-cols-3 gap-3">
            {EARNINGS.map(({ label, amount }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}
              >
                <p className="text-xs mb-1" style={{ color: 'rgba(196,181,212,0.6)' }}>{label}</p>
                <p className="text-white font-bold text-sm">{amount}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm">Payment Method</h2>
            <Link href="/earn/payment-methods" className="text-xs text-accent hover:text-purple-300 transition-colors">
              Add New
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { icon: Smartphone, name: 'Mobile Money', sub: 'MTN, Vodafone, AirtelTigo' },
              { icon: CreditCard, name: 'Paystack', sub: 'Bank & Card payments' },
            ].map(({ icon: Icon, name, sub }) => (
              <div
                key={name}
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))', border: '1px solid rgba(168,85,247,0.25)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(124,58,237,0.2)' }}
                >
                  <Icon size={18} className="text-accent" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{name}</p>
                  <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>{sub}</p>
                </div>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
        >
          <p className="text-xs" style={{ color: 'rgba(196,181,212,0.6)' }}>
            Minimum withdrawal is $5.00. Payouts are processed within 2–5 business days.
          </p>
        </div>

      </main>

      <BottomNav />
    </div>
  );
}

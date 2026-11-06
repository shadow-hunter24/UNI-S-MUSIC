'use client';
import { useState } from 'react';
import { ArrowLeft, Smartphone, CreditCard, Save } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

type PaymentMethod = 'mobile-money' | 'paystack';

export default function PaymentMethodsPage() {
  const [selected, setSelected] = useState<PaymentMethod>('mobile-money');

  const options: { id: PaymentMethod; icon: typeof Smartphone; label: string; description: string }[] = [
    { id: 'mobile-money', icon: Smartphone, label: 'Mobile Money', description: 'MTN, Vodafone, AirtelTigo' },
    { id: 'paystack', icon: CreditCard, label: 'Paystack', description: 'Bank & Card payments' },
  ];

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
        <h1 className="text-lg font-bold text-white">Add Payment Method</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">

        {/* Radio options */}
        <div className="space-y-3" role="radiogroup" aria-label="Payment method">
          {options.map(({ id, icon: Icon, label, description }) => {
            const isSelected = selected === id;
            return (
              <button
                key={id}
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all hover:scale-[1.01]"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(168,85,247,0.1))'
                    : 'linear-gradient(135deg,rgba(42,13,74,0.6),rgba(26,5,51,0.8))',
                  border: isSelected ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(168,85,247,0.2)',
                  boxShadow: isSelected ? '0 0 15px rgba(124,58,237,0.2)' : 'none',
                }}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isSelected ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.2)' }}
                >
                  <Icon size={20} className="text-white" aria-hidden="true" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.6)' }}>{description}</p>
                </div>

                {/* Radio indicator */}
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: isSelected ? '2px solid #a855f7' : '2px solid rgba(168,85,247,0.3)',
                    background: isSelected ? 'rgba(168,85,247,0.2)' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.8)' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tips */}
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
        >
          <p className="text-xs font-semibold text-white mb-2">Tips</p>
          <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: 'rgba(196,181,212,0.6)' }}>
            <li>Mobile Money supports instant payouts 24/7</li>
            <li>Paystack supports bank transfers and card payments</li>
            <li>You can add multiple payment methods</li>
          </ul>
        </div>

      </main>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
        >
          <Save size={16} aria-hidden="true" />
          Save Payment Method
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

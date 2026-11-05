'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Music2, Upload, DollarSign } from 'lucide-react';

const SLIDES = [
  {
    icon: Music2,
    title: 'Discover & Stream',
    desc: 'Find your next favourite track from artists worldwide. Stream high-quality music anytime, anywhere.',
    color: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  },
  {
    icon: Upload,
    title: 'Upload Your Music',
    desc: 'Share your sound with the world. Free uploads, no review required. Your music, your rules.',
    color: 'linear-gradient(135deg,#a855f7,#ec4899)',
  },
  {
    icon: DollarSign,
    title: 'Earn Real Money',
    desc: 'Get paid via Mobile Money and Paystack for your streams. Transparent, auditable earnings.',
    color: 'linear-gradient(135deg,#ec4899,#7c3aed)',
  },
];

export default function OnboardingPage() {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide]!;
  const Icon = current.icon;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-12" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      {/* Skip */}
      <div className="w-full flex justify-end">
        <Link href="/auth/register" className="text-sm font-medium" style={{ color: 'rgba(196,181,212,0.6)' }}>Skip</Link>
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center text-center flex-1 justify-center max-w-xs">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8" style={{ background: current.color, boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
          <Icon size={44} className="text-white" aria-hidden="true" />
        </div>
        {/* Glow */}
        <div className="absolute w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse,rgba(168,85,247,0.25) 0%,transparent 70%)', filter: 'blur(30px)' }} aria-hidden="true" />
        <h2 className="text-3xl font-black text-white mb-4">{current.title}</h2>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(196,181,212,0.7)' }}>{current.desc}</p>
      </div>

      {/* Bottom */}
      <div className="w-full max-w-xs space-y-5">
        {/* Dots */}
        <div className="flex justify-center gap-2" role="tablist" aria-label="Slide indicators">
          {SLIDES.map((_, i) => (
            <button key={i} role="tab" aria-selected={i === slide} onClick={() => setSlide(i)}
              className="rounded-full transition-all"
              style={{ width: i === slide ? 24 : 8, height: 8, background: i === slide ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'rgba(168,85,247,0.25)' }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {isLast
          ? <Link href="/auth/register" className="block w-full py-3.5 rounded-xl font-bold text-sm text-white text-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>Get Started</Link>
          : <button onClick={() => setSlide((s) => s + 1)} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>Next</button>
        }
      </div>
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Music2, Upload, DollarSign } from 'lucide-react';

function markOnboarded() {
  if (typeof window !== 'undefined') localStorage.setItem('unis_onboarded', '1');
}

// One background photo per slide — dark moody music aesthetic from Unsplash
const SLIDES = [
  {
    icon: Music2,
    title: 'Discover & Stream',
    desc: 'Find your next favourite track from artists worldwide. Stream high-quality music anytime, anywhere.',
    bg: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
    color: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  },
  {
    icon: Upload,
    title: 'Upload Your Music',
    desc: 'Share your sound with the world. Free uploads, no review required. Your music, your rules.',
    bg: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80',
    color: 'linear-gradient(135deg,#a855f7,#ec4899)',
  },
  {
    icon: DollarSign,
    title: 'Earn Real Money',
    desc: 'Get paid via Mobile Money and Paystack for your streams. Transparent, auditable earnings.',
    bg: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=800&q=80',
    color: 'linear-gradient(135deg,#ec4899,#7c3aed)',
  },
];

export default function OnboardingPage() {
  const [slide, setSlide] = useState(0);
  const router = useRouter();
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide]!;
  const Icon = current.icon;

  function finish() {
    markOnboarded();
    router.push('/auth/register');
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#0d0121' }}>

      {/* Full-bleed background photo — fades between slides */}
      <div className="absolute inset-0 z-0">
        <Image
          key={current.bg}
          src={current.bg}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          aria-hidden="true"
        />
        {/* Heavy dark overlay so text is legible */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,1,33,0.6) 0%, rgba(13,1,33,0.55) 40%, rgba(13,1,33,0.88) 75%, #0d0121 100%)' }} />
        {/* Purple tint */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(124,58,237,0.3) 0%, transparent 70%)' }} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-6 py-12">

        {/* Skip */}
        <div className="w-full flex justify-end">
          <button onClick={finish} className="text-sm font-medium" style={{ color: 'rgba(196,181,212,0.7)' }}>
            Skip
          </button>
        </div>

        {/* Slide content */}
        <div className="flex flex-col items-center text-center flex-1 justify-center max-w-xs">
          {/* Icon pill */}
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-2xl" style={{ background: current.color, boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
            <Icon size={40} className="text-white" aria-hidden="true" />
          </div>

          <h2 className="text-3xl font-black text-white mb-4 drop-shadow-lg">{current.title}</h2>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(224,204,240,0.85)' }}>{current.desc}</p>
        </div>

        {/* Bottom controls */}
        <div className="w-full max-w-xs space-y-5">
          {/* Dot indicators */}
          <div className="flex justify-center gap-2" role="tablist" aria-label="Slide indicators">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === slide}
                onClick={() => setSlide(i)}
                className="rounded-full transition-all"
                style={{ width: i === slide ? 24 : 8, height: 8, background: i === slide ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : 'rgba(168,85,247,0.3)' }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {isLast
            ? <button onClick={finish} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>Get Started</button>
            : <button onClick={() => setSlide((s) => s + 1)} className="w-full py-3.5 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>Next</button>
          }
        </div>
      </div>
    </div>
  );
}

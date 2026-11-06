'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { Upload, DollarSign, Globe, Music2 } from 'lucide-react';

// Unsplash – moody music/artist photos for cover cards
const TRENDING = [
  {
    title: 'Midnight Vibes',
    artist: 'Burna Boy',
    img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&q=80',
  },
  {
    title: 'Afro Nation',
    artist: 'Wizkid',
    img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80',
  },
  {
    title: 'Golden Era',
    artist: 'Davido',
    img: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=300&q=80',
  },
  {
    title: 'Soul Waves',
    artist: 'Tems',
    img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80',
  },
];

const GENRES = [
  { name: 'Afrobeats', slug: 'afrobeats', color: 'from-pink-600 to-purple-700' },
  { name: 'Hip Hop',   slug: 'hip-hop',   color: 'from-violet-600 to-indigo-700' },
  { name: 'Gospel',   slug: 'gospel',    color: 'from-blue-600 to-purple-700' },
  { name: 'R&B',      slug: 'rnb',       color: 'from-purple-600 to-pink-700' },
  { name: 'Reggae',   slug: 'reggae',    color: 'from-emerald-600 to-teal-700' },
  { name: 'Electronic', slug: 'electronic', color: 'from-cyan-600 to-blue-700' },
  { name: 'Rock',     slug: 'rock',      color: 'from-red-600 to-rose-700' },
  { name: 'Country',  slug: 'country',   color: 'from-amber-600 to-orange-700' },
];

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('unis_onboarded')) {
      router.replace('/onboarding');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d0121' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full h-[480px] md:h-[560px] overflow-hidden">
        {/* Hero photo – woman with headphones */}
        <Image
          src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=85"
          alt="Artist with headphones"
          fill
          priority
          className="object-cover object-top"
          sizes="100vw"
        />
        {/* Dark overlay so text is readable */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(13,1,33,0.55) 0%, rgba(13,1,33,0.3) 40%, rgba(13,1,33,0.92) 85%, #0d0121 100%)' }} />
        {/* Purple glow overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 50%, rgba(124,58,237,0.35) 0%, transparent 70%)' }} aria-hidden="true" />

        {/* Top navbar */}
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
              <span className="text-white font-black text-sm">U</span>
            </div>
            <div>
              <div className="flex items-baseline leading-none">
                <span className="font-black text-lg" style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s</span>
                <span className="font-black text-lg text-white ml-1">Music</span>
              </div>
              <p className="text-xs text-purple-300/70">Stream. Upload. Earn. Connect.</p>
            </div>
          </div>

          {/* Desktop feature badges */}
          <div className="hidden md:flex items-center gap-6 text-xs text-purple-200">
            {[
              { Icon: Upload, label: 'Free Uploads', sub: '(No Review)' },
              { Icon: DollarSign, label: 'Real Money Payouts', sub: '(Mobile Money & Paystack)' },
              { Icon: Globe, label: 'Global Reach', sub: '(Stream, Grow, Earn.)' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={13} className="text-purple-400" />
                <div>
                  <p className="font-semibold text-white">{label}</p>
                  <p className="text-purple-300/60">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="text-sm text-purple-200 hover:text-white px-3 py-1.5 transition-colors">Log In</Link>
            <Link href="/auth/register" className="text-sm font-bold text-white px-4 py-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.5)' }}>Sign Up</Link>
          </div>
        </header>

        {/* Hero text overlay */}
        <div className="absolute bottom-12 left-0 right-0 px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-purple-200 border border-purple-500/30 mb-4" style={{ background: 'rgba(124,58,237,0.2)' }}>
            <Music2 size={12} className="text-purple-400" aria-hidden="true" />
            Music for Everyone. Opportunities for Artists.
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-2" style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.6))' }}>
            Uni&apos;s Music
          </h1>
          <p className="text-purple-200/80 text-base mb-1">Discover. Stream. Support.</p>
          <p className="text-purple-300/60 text-sm mb-6">Your music. Your voice. Our platform.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth/register" className="font-bold text-white py-3 px-7 rounded-full text-sm" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 25px rgba(124,58,237,0.6)' }}>Get Started</Link>
            <Link href="/auth/login" className="font-medium text-purple-300 py-3 px-7 rounded-full text-sm border border-purple-500/40 hover:text-white hover:bg-purple-900/20 transition-all">Log In</Link>
          </div>
        </div>
      </div>

      {/* ── Trending Now ─────────────────────────────────────────── */}
      <main className="flex-1 px-4 pb-24 space-y-8 mt-6">
        <section aria-label="Trending Now">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">Trending Now</h2>
            <Link href="/home" className="text-xs text-purple-400 hover:text-purple-300">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRENDING.map((item) => (
              <Link key={item.title} href="/home" className="rounded-xl overflow-hidden group cursor-pointer" style={{ border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="relative aspect-square">
                  <Image src={item.img} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 50vw, 25vw" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,transparent 50%,rgba(13,1,33,0.85) 100%)' }} />
                </div>
                <div className="p-2" style={{ background: 'rgba(26,5,51,0.9)' }}>
                  <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  <p className="text-xs text-purple-300/60 truncate">{item.artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Genres ───────────────────────────────────────────────── */}
        <section aria-label="Top Genres">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-base">Genres</h2>
            <Link href="/browse" className="text-xs text-purple-400 hover:text-purple-300">View All</Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRES.map((g) => (
              <Link key={g.slug} href={`/genre/${g.slug}`}
                className={`flex items-center justify-center py-3 rounded-xl text-xs font-bold text-white text-center transition-all hover:scale-105 bg-gradient-to-br ${g.color}`}
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                {g.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Mobile feature badges */}
        <div className="flex md:hidden flex-wrap gap-3">
          {[
            { Icon: Upload,      label: 'Free Uploads',       sub: 'No Review' },
            { Icon: DollarSign,  label: 'Real Money Payouts', sub: 'Mobile Money' },
            { Icon: Globe,       label: 'Global Reach',       sub: 'Stream, Grow, Earn.' },
          ].map(({ Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/20" style={{ background: 'rgba(124,58,237,0.1)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.2)' }}>
                <Icon size={13} className="text-purple-400" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none mb-0.5">{label}</p>
                <p className="text-xs text-purple-300/60">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

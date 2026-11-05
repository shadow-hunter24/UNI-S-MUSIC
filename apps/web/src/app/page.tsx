import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { Upload, DollarSign, Globe, Music2, Play } from 'lucide-react';

const GENRES = [
  { name: 'Afrobeats', slug: 'afrobeats', color: 'from-pink-600 to-purple-700' },
  { name: 'Hip Hop', slug: 'hip-hop', color: 'from-violet-600 to-indigo-700' },
  { name: 'Gospel', slug: 'gospel', color: 'from-blue-600 to-purple-700' },
  { name: 'R&B', slug: 'rnb', color: 'from-purple-600 to-pink-700' },
  { name: 'Reggae', slug: 'reggae', color: 'from-emerald-600 to-teal-700' },
  { name: 'Electronic', slug: 'electronic', color: 'from-cyan-600 to-blue-700' },
  { name: 'Rock', slug: 'rock', color: 'from-red-600 to-rose-700' },
  { name: 'Country', slug: 'country', color: 'from-amber-600 to-orange-700' },
];

const TRENDING_PLACEHOLDERS = [
  { title: 'Trending Track', artist: 'Artist Name' },
  { title: 'New Release', artist: 'Artist Name' },
  { title: 'Hot Right Now', artist: 'Artist Name' },
  { title: 'Top Pick', artist: 'Artist Name' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0d0121 0%, #130329 40%, #0d0121 100%)' }}>

      {/* Top navbar */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-purple-900/40">
        {/* Logo */}
        <div className="flex items-center gap-2">
          {/* U logomark */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
            <span className="text-white font-black text-sm">U</span>
          </div>
          <div>
            <div className="flex items-baseline gap-0.5 leading-none">
              <span className="font-black text-lg" style={{ background: 'linear-gradient(135deg, #c026d3, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Uni&apos;s</span>
              <span className="font-black text-lg text-white ml-1">Music</span>
            </div>
            <p className="text-xs text-purple-300/70 tracking-wide">Stream. Upload. Earn. Connect.</p>
          </div>
        </div>

        {/* Feature badges — desktop */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-purple-200">
            <Upload size={13} className="text-accent" />
            <div>
              <p className="font-semibold text-white">Free Uploads</p>
              <p className="text-purple-300/70">(No Review)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-200">
            <DollarSign size={13} className="text-accent" />
            <div>
              <p className="font-semibold text-white">Real Money Payouts</p>
              <p className="text-purple-300/70">(Mobile Money &amp; Paystack)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-200">
            <Globe size={13} className="text-accent" />
            <div>
              <p className="font-semibold text-white">Global Reach</p>
              <p className="text-purple-300/70">(Stream, Grow, Earn.)</p>
            </div>
          </div>
        </div>

        {/* Auth links */}
        <div className="flex items-center gap-2">
          <Link href="/auth/login" className="text-sm text-purple-300 hover:text-white transition-colors px-3 py-1.5">
            Log In
          </Link>
          <Link
            href="/auth/register"
            className="text-sm font-semibold text-white px-4 py-1.5 rounded-full transition-all"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(139,43,226,0.35) 0%, transparent 70%)', filter: 'blur(40px)' }} aria-hidden="true" />

      {/* Main hero */}
      <main className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-12 pb-24">

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-purple-200 border border-purple-500/30" style={{ background: 'rgba(124,58,237,0.15)' }}>
          <Music2 size={12} className="text-accent" aria-hidden="true" />
          Music for Everyone. Opportunities for Artists.
        </div>

        {/* Hero logo */}
        <div className="mb-4 select-none" aria-label="Uni's Music">
          <div
            className="text-5xl md:text-7xl font-black tracking-tight"
            style={{ background: 'linear-gradient(135deg, #e879f9, #a855f7, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.5))' }}
          >
            Uni&apos;s
          </div>
          <div className="text-5xl md:text-7xl font-black tracking-tight text-white" style={{ marginTop: '-8px' }}>
            Music
          </div>
        </div>

        {/* Subheading */}
        <p className="text-base md:text-lg text-purple-200/80 max-w-md mb-3 leading-relaxed">
          Discover. Stream. Support.
        </p>
        <p className="text-sm text-purple-300/60 max-w-xs mb-10">
          Your music. Your voice. Our platform.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm justify-center mb-4">
          <Link
            href="/auth/register"
            className="flex-1 flex items-center justify-center gap-2 font-bold text-white py-3 px-6 rounded-full text-sm transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 25px rgba(124,58,237,0.5), 0 4px 15px rgba(124,58,237,0.3)' }}
          >
            Get Started
          </Link>
          <Link
            href="/auth/login"
            className="flex-1 flex items-center justify-center font-medium text-purple-300 py-3 px-6 rounded-full text-sm border border-purple-500/40 transition-all hover:border-purple-400 hover:text-white hover:bg-purple-900/20"
          >
            Log In
          </Link>
        </div>
        <p className="text-xs text-purple-400/50 mb-12">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-accent hover:underline">Log In</Link>
        </p>

        {/* Mobile feature badges */}
        <div className="flex md:hidden flex-wrap justify-center gap-3 mb-12">
          {[
            { icon: Upload, label: 'Free Uploads', sub: 'No Review' },
            { icon: DollarSign, label: 'Real Money Payouts', sub: 'Mobile Money' },
            { icon: Globe, label: 'Global Reach', sub: 'Stream, Grow, Earn.' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-purple-500/20 text-left" style={{ background: 'rgba(124,58,237,0.1)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.2)' }}>
                <Icon size={13} className="text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white leading-none mb-0.5">{label}</p>
                <p className="text-xs text-purple-300/60">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trending Now */}
        <section className="w-full max-w-lg" aria-label="Trending Now">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-base">Trending Now</h2>
            <Link href="/home" className="text-xs text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRENDING_PLACEHOLDERS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-3 cursor-pointer hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.08))', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                {/* Cover art placeholder */}
                <div className="aspect-square rounded-lg mb-2 flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(168,85,247,0.2))' }}>
                  <Play size={20} className="text-white/60" aria-hidden="true" />
                  <div className="absolute inset-0 animate-pulse" style={{ background: 'rgba(168,85,247,0.1)' }} />
                </div>
                <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                <p className="text-xs text-purple-300/60 truncate">{item.artist}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Genres */}
        <section className="mt-10 w-full max-w-lg" aria-label="Top Genres">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-base">Genres</h2>
            <Link href="/browse" className="text-xs text-accent hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {GENRES.map((genre) => (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                className={`flex flex-col items-center justify-center py-3 rounded-xl text-xs font-bold text-white text-center transition-all hover:scale-105 bg-gradient-to-br ${genre.color}`}
                style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

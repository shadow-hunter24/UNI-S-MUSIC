import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { BottomNav } from '@/components/layout/BottomNav';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center pb-20">
        {/* Logo treatment */}
        <div className="mb-8 select-none" aria-label="Uni's Music">
          <span className="text-5xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-5xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        {/* Tagline */}
        <p className="text-lg text-text-secondary max-w-sm mb-10 leading-relaxed">
          Music for Everyone.
          <br />
          Opportunities for Artists.
        </p>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button size="lg" className="w-full">
            Get Started
          </Button>
          <Link
            href="/auth/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2 underline-offset-4 hover:underline"
          >
            Log In
          </Link>
        </div>

        {/* Genre teaser */}
        <div className="mt-16 flex flex-wrap justify-center gap-2 max-w-sm">
          {['Afrobeats', 'Hip Hop', 'Gospel', 'R&B', 'Reggae'].map((genre) => (
            <span
              key={genre}
              className="px-3 py-1 rounded-full text-xs font-medium bg-bg-elevated text-text-secondary border border-bg-elevated"
            >
              {genre}
            </span>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

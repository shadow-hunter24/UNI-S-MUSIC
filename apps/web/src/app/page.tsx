import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { BottomNav } from '@/components/layout/BottomNav';

const GENRES = [
  { name: 'Afrobeats', slug: 'afrobeats' },
  { name: 'Hip Hop', slug: 'hip-hop' },
  { name: 'Gospel', slug: 'gospel' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Drill', slug: 'drill' },
  { name: 'Pop', slug: 'pop' },
  { name: 'Jazz', slug: 'jazz' },
];

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

        {/* Trending Now skeleton placeholders */}
        <section className="mt-16 w-full max-w-sm" aria-label="Trending Now">
          <h2 className="text-white font-semibold text-left mb-3">Trending Now</h2>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-bg-elevated rounded-lg p-3 animate-pulse" aria-hidden="true">
                <div className="aspect-square rounded-lg bg-bg-surface mb-2" />
                <div className="h-3 bg-bg-surface rounded w-3/4 mb-1.5" />
                <div className="h-2.5 bg-bg-surface rounded w-1/2" />
              </div>
            ))}
          </div>
        </section>

        {/* Top Genres */}
        <section className="mt-10 w-full max-w-sm" aria-label="Top Genres">
          <h2 className="text-white font-semibold text-left mb-3">Top Genres</h2>
          <div className="flex flex-wrap justify-start gap-2">
            {GENRES.map((genre) => (
              <Link
                key={genre.slug}
                href={`/genre/${genre.slug}`}
                className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

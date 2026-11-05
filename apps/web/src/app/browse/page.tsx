import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const GENRE_STYLES: Record<string, string> = {
  afrobeats: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
  'hip-hop': 'linear-gradient(135deg,#7c3aed,#4f46e5)',
  gospel: 'linear-gradient(135deg,#3b82f6,#7c3aed)',
  rnb: 'linear-gradient(135deg,#a855f7,#ec4899)',
  reggae: 'linear-gradient(135deg,#10b981,#059669)',
  electronic: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
  rock: 'linear-gradient(135deg,#ef4444,#dc2626)',
  country: 'linear-gradient(135deg,#f59e0b,#d97706)',
  jazz: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
  pop: 'linear-gradient(135deg,#f472b6,#a855f7)',
};

async function getGenres() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${API_BASE}/api/v1/genres`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ id: string; name: string; slug: string; imageUrl?: string; trackCount: number }>>;
  } catch { return []; }
}

export default async function BrowsePage() {
  const genres = await getGenres();

  const fallback = [
    { id: '1', name: 'Afrobeats', slug: 'afrobeats', trackCount: 0 },
    { id: '2', name: 'Hip Hop', slug: 'hip-hop', trackCount: 0 },
    { id: '3', name: 'Gospel', slug: 'gospel', trackCount: 0 },
    { id: '4', name: 'R&B', slug: 'rnb', trackCount: 0 },
    { id: '5', name: 'Reggae', slug: 'reggae', trackCount: 0 },
    { id: '6', name: 'Electronic', slug: 'electronic', trackCount: 0 },
    { id: '7', name: 'Rock', slug: 'rock', trackCount: 0 },
    { id: '8', name: 'Country', slug: 'country', trackCount: 0 },
  ];

  const items = genres.length > 0 ? genres : fallback;

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="sticky top-0 z-20 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <h1 className="text-xl font-bold text-white">Genres</h1>
      </header>

      <main className="flex-1 px-4 py-5">
        <div className="grid grid-cols-2 gap-3">
          {items.map((genre) => {
            const bg = GENRE_STYLES[genre.slug] ?? 'linear-gradient(135deg,#7c3aed,#a855f7)';
            return (
              <Link key={genre.id} href={`/genre/${genre.slug}`}
                className="relative rounded-2xl overflow-hidden h-28 flex flex-col justify-end p-4 transition-transform hover:scale-105"
                style={{ background: bg, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 60%)' }} aria-hidden="true" />
                <p className="relative text-white font-bold text-base leading-tight">{genre.name}</p>
                {genre.trackCount > 0 && (
                  <p className="relative text-white/60 text-xs mt-0.5">{genre.trackCount} tracks</p>
                )}
              </Link>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

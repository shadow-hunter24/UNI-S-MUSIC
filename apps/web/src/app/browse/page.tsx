import { BottomNav } from '@/components/layout/BottomNav';
import { GenreCard } from '@/components/music/GenreCard';

async function getGenres() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${API_BASE}/api/v1/genres`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json() as Promise<Array<{ id: string; name: string; slug: string; imageUrl?: string; trackCount: number }>>;
  } catch {
    return [];
  }
}

export default async function BrowsePage() {
  const genres = await getGenres();

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-20">
      <main className="flex-1 px-4 py-6">
        <h1 className="text-2xl font-bold text-white mb-6">Browse Genres</h1>
        {genres.length === 0 ? (
          <p className="text-text-secondary text-center mt-12">No genres available yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {genres.map((genre) => (
              <GenreCard
                key={genre.id}
                name={genre.name}
                slug={genre.slug}
                imageUrl={genre.imageUrl}
                trackCount={genre.trackCount}
              />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

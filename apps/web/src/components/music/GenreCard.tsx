import Link from 'next/link';

interface GenreCardProps {
  name: string;
  slug: string;
  imageUrl?: string;
  trackCount: number;
}

export function GenreCard({ name, slug, imageUrl, trackCount }: GenreCardProps) {
  return (
    <Link
      href={`/genre/${slug}`}
      className="block rounded-lg overflow-hidden relative aspect-video bg-gradient-to-br from-primary/20 to-accent/10 hover:from-primary/30 hover:to-accent/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`Browse ${name} genre`}
    >
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 p-4 flex flex-col justify-end h-full">
        <p className="text-white font-semibold text-sm">{name}</p>
        <p className="text-text-secondary text-xs">{trackCount} tracks</p>
      </div>
    </Link>
  );
}

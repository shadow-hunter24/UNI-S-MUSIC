import Link from 'next/link';
import { Lock, Music } from 'lucide-react';

interface PlaylistCardProps {
  id: string;
  title: string;
  trackCount: number;
  coverImageUrl?: string;
  isPublic: boolean;
}

export function PlaylistCard({ id, title, trackCount, coverImageUrl, isPublic }: PlaylistCardProps) {
  return (
    <Link
      href={`/playlists/${id}`}
      className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg hover:bg-bg-elevated/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={`${title}${!isPublic ? ' (private)' : ''}`}
    >
      {/* Cover */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-bg-surface flex items-center justify-center shrink-0">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" aria-hidden="true" className="w-full h-full object-cover" />
        ) : (
          <Music className="w-5 h-5 text-primary/60" aria-hidden="true" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-white text-sm font-medium truncate">{title}</span>
        <span className="text-text-secondary text-xs">{trackCount} tracks</span>
      </div>

      {/* Private badge */}
      {!isPublic && (
        <Lock className="w-4 h-4 text-text-secondary shrink-0" aria-label="Private playlist" />
      )}
    </Link>
  );
}

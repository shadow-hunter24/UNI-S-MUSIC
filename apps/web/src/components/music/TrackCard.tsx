'use client';
import { useState } from 'react';
import { Heart, Play } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';

interface TrackCardProps {
  id: string;
  title: string;
  artistName: string;
  coverImageUrl?: string;
  durationSeconds?: number;
  playCount: number;
  likeCount: number;
  isLiked?: boolean;
}

function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function TrackCard({
  id,
  title,
  artistName,
  coverImageUrl,
  playCount,
  likeCount,
  isLiked: initialLiked = false,
}: TrackCardProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCountState, setLikeCountState] = useState(likeCount);
  const [loading, setLoading] = useState(false);

  async function toggleLike() {
    if (loading) return;
    setLoading(true);
    try {
      if (liked) {
        await apiFetch(`/api/v1/tracks/${id}/like`, { method: 'DELETE' });
        setLiked(false);
        setLikeCountState((c) => Math.max(0, c - 1));
      } else {
        await apiFetch(`/api/v1/tracks/${id}/like`, { method: 'POST' });
        setLiked(true);
        setLikeCountState((c) => c + 1);
      }
    } catch {
      // silently fail if not authenticated
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className="bg-bg-elevated rounded-lg overflow-hidden flex flex-col gap-2 p-3 hover:bg-bg-elevated/80 transition-colors"
      aria-label={`${title} by ${artistName}`}
    >
      {/* Cover art */}
      <div className="aspect-square rounded-lg overflow-hidden bg-bg-surface flex items-center justify-center relative group">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt={`${title} cover`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary/60" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-white font-medium text-sm truncate">{title}</p>
        <p className="text-text-secondary text-xs truncate">{artistName}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-xs">{formatPlayCount(playCount)} plays</span>
        <button
          onClick={toggleLike}
          disabled={loading}
          aria-label={liked ? 'Unlike track' : 'Like track'}
          aria-pressed={liked}
          className={clsx(
            'flex items-center gap-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded',
            liked ? 'text-red-500' : 'text-text-secondary hover:text-red-400',
          )}
        >
          <Heart
            className={clsx('w-4 h-4', liked && 'fill-current')}
            aria-hidden="true"
          />
          <span>{likeCountState}</span>
        </button>
      </div>
    </article>
  );
}

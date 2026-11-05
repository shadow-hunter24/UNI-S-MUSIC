'use client';
import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { apiFetch } from '@/lib/api';

interface ArtistCardProps {
  id: string;
  stageName: string;
  imageUrl?: string;
  totalFollowers: number;
  isVerified: boolean;
  isFollowing?: boolean;
}

function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ArtistCard({
  id,
  stageName,
  imageUrl,
  totalFollowers,
  isVerified,
  isFollowing: initialFollowing = false,
}: ArtistCardProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggleFollow() {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await apiFetch(`/api/v1/artists/${id}/follow`, { method: 'DELETE' });
        setFollowing(false);
      } else {
        await apiFetch(`/api/v1/artists/${id}/follow`, { method: 'POST' });
        setFollowing(true);
      }
    } catch {
      // silently fail if not authenticated
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-bg-elevated rounded-lg">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-surface flex items-center justify-center shrink-0">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={stageName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{getInitials(stageName)}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-1">
          <span className="text-white font-medium text-sm">{stageName}</span>
          {isVerified && (
            <CheckCircle className="w-4 h-4 text-primary" aria-label="Verified artist" />
          )}
        </div>
        <span className="text-text-secondary text-xs">{formatFollowers(totalFollowers)} followers</span>
      </div>

      {/* Follow button */}
      <button
        onClick={toggleFollow}
        disabled={loading}
        aria-label={following ? `Unfollow ${stageName}` : `Follow ${stageName}`}
        className={clsx(
          'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          following
            ? 'border border-primary text-primary hover:bg-primary/10'
            : 'bg-primary text-white hover:bg-primary-dark',
        )}
      >
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

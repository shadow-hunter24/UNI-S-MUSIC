'use client';
import { useState } from 'react';
import { Heart, Play, Music } from 'lucide-react';
import NextImage from 'next/image';
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

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TrackCard({ id, title, artistName, coverImageUrl, playCount, likeCount, isLiked: init = false }: TrackCardProps) {
  const [liked, setLiked] = useState(init);
  const [likes, setLikes] = useState(likeCount);
  const [loading, setLoading] = useState(false);

  async function toggleLike() {
    if (loading) return;
    setLoading(true);
    try {
      if (liked) {
        await apiFetch(`/api/v1/tracks/${id}/like`, { method: 'DELETE' });
        setLiked(false); setLikes((c) => Math.max(0, c - 1));
      } else {
        await apiFetch(`/api/v1/tracks/${id}/like`, { method: 'POST' });
        setLiked(true); setLikes((c) => c + 1);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  return (
    <article
      className="group flex flex-col gap-2 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.03]"
      style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.18)' }}
      aria-label={`${title} by ${artistName}`}
    >
      {/* Cover */}
      <div className="aspect-square rounded-lg overflow-hidden relative flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))' }}>
        {coverImageUrl
          ? <NextImage src={coverImageUrl} alt={`${title} cover`} fill sizes="(max-width:640px) 50vw, 160px" className="object-cover" />
          : <Music className="w-8 h-8 text-purple-400/50" aria-hidden="true" />
        }
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.6)' }}>
            <Play className="w-4 h-4 text-white fill-white" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <p className="text-white font-semibold text-xs truncate">{title}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(196,181,212,0.7)' }}>{artistName}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>{fmt(playCount)}</span>
        <button onClick={toggleLike} disabled={loading} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked}
          className={clsx('flex items-center gap-1 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded', liked ? 'text-red-400' : 'text-purple-400/50 hover:text-red-400')}>
          <Heart className={clsx('w-3.5 h-3.5', liked && 'fill-current')} style={liked ? { filter: 'drop-shadow(0 0 4px rgba(248,113,113,0.8))' } : undefined} aria-hidden="true" />
          <span>{likes}</span>
        </button>
      </div>
    </article>
  );
}

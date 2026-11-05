'use client';
import { useState } from 'react';
import { CheckCircle, Music } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ArtistCardProps {
  id: string;
  stageName: string;
  imageUrl?: string;
  totalFollowers: number;
  isVerified: boolean;
  isFollowing?: boolean;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export function ArtistCard({ id, stageName, imageUrl, totalFollowers, isVerified, isFollowing: init = false }: ArtistCardProps) {
  const [following, setFollowing] = useState(init);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      await apiFetch(`/api/v1/artists/${id}/follow`, { method: following ? 'DELETE' : 'POST' });
      setFollowing(!following);
    } catch { /* silent */ } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.18)' }}>
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(168,85,247,0.2))', boxShadow: '0 0 0 2px rgba(168,85,247,0.4), 0 0 15px rgba(124,58,237,0.3)' }}>
        {imageUrl
          ? <img src={imageUrl} alt={stageName} className="w-full h-full object-cover" />
          : <span className="text-lg font-bold text-purple-300">{initials(stageName)}</span>
        }
      </div>

      {/* Name */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-white font-semibold text-sm truncate max-w-[100px]">{stageName}</span>
          {isVerified && <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" aria-label="Verified" />}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.6)' }}>{fmt(totalFollowers)} followers</p>
      </div>

      {/* Follow */}
      <button onClick={toggle} disabled={loading} aria-label={following ? `Unfollow ${stageName}` : `Follow ${stageName}`}
        className="px-5 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 disabled:opacity-60"
        style={following
          ? { border: '1px solid rgba(168,85,247,0.5)', color: '#a855f7', background: 'transparent' }
          : { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}>
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { TrackDto } from '@unis-music/contracts';

interface TracksQuery {
  genre?: string;
  search?: string;
  sort?: 'trending' | 'recent' | 'popular';
  cursor?: string;
  limit?: number;
}

interface TracksResponse {
  items: TrackDto[];
  nextCursor?: string;
}

function buildQs(params?: TracksQuery): string {
  if (!params) return '';
  const q = new URLSearchParams();
  if (params.genre) q.set('genre', params.genre);
  if (params.search) q.set('search', params.search);
  if (params.sort) q.set('sort', params.sort);
  if (params.cursor) q.set('cursor', params.cursor);
  if (params.limit) q.set('limit', String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function useTracks(params?: TracksQuery) {
  return useQuery({
    queryKey: ['tracks', params],
    queryFn: () => apiFetch<TracksResponse>(`/api/v1/tracks${buildQs(params)}`),
  });
}

export function useTrack(id: string) {
  return useQuery({
    queryKey: ['track', id],
    queryFn: () => apiFetch<TrackDto>(`/api/v1/tracks/${id}`),
    enabled: !!id,
  });
}

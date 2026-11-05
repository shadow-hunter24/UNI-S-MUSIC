import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { FeedDto, TrackDto } from '@unis-music/contracts';

export function useFeed() {
  return useQuery({
    queryKey: ['feed', 'home'],
    queryFn: () => apiFetch<FeedDto>('/api/v1/feed/home'),
  });
}

export function useTrending(limit = 20) {
  return useQuery({
    queryKey: ['feed', 'trending', limit],
    queryFn: () => apiFetch<TrackDto[]>(`/api/v1/feed/trending?limit=${limit}`),
  });
}

export function useNewReleases(limit = 20) {
  return useQuery({
    queryKey: ['feed', 'new-releases', limit],
    queryFn: () => apiFetch<TrackDto[]>(`/api/v1/feed/new-releases?limit=${limit}`),
  });
}

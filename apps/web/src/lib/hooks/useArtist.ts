import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ArtistProfileDto } from '@unis-music/contracts';

export function useArtist(id: string) {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: () => apiFetch<ArtistProfileDto>(`/api/v1/artists/${id}`),
    enabled: !!id,
  });
}

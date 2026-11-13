import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ArtistProfileDto } from '@unis-music/contracts';

export function useArtist(id: string) {
  return useQuery({
    queryKey: ['artist', id],
    queryFn: () => apiFetch<ArtistProfileDto>(`/api/v1/artists/${id}`),
    enabled: !!id,
  });
}

export interface ArtistProfile {
  id: string;
  stageName: string;
  bio?: string;
  imageUrl?: string;
  headerImageUrl?: string;
  country?: string;
  websiteUrl?: string;
  totalFollowers: number;
  totalTracks: number;
  isVerified: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface VerificationProgress {
  current: number;
  required: number;
}

export interface VerificationStatusResponse {
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified: boolean;
  totalFollowers: number;
  totalTracks: number;
  autoVerifyProgress: {
    followers: VerificationProgress;
    tracks: VerificationProgress;
    likes: VerificationProgress;
  };
}

export interface PendingVerificationItem {
  id: string;
  stageName: string;
  bio?: string;
  imageUrl?: string;
  totalFollowers: number;
  totalTracks: number;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: { email: string; username: string };
}

export interface PendingVerificationsResponse {
  items: PendingVerificationItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ApplyArtistInput {
  stageName: string;
  bio?: string;
}

export interface ReviewVerificationInput {
  id: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export function useArtistMe() {
  return useQuery<ArtistProfile>({
    queryKey: ['artist', 'me'],
    queryFn: () => apiFetch<ArtistProfile>('/api/v1/artists/me'),
  });
}

export function useApplyArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ApplyArtistInput) =>
      apiFetch<ArtistProfile>('/api/v1/artists/apply', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      void queryClient.invalidateQueries({ queryKey: ['artist', 'me'] });
    },
  });
}

export function useMyVerificationStatus() {
  return useQuery<VerificationStatusResponse>({
    queryKey: ['artist', 'me', 'verification-status'],
    queryFn: () => apiFetch<VerificationStatusResponse>('/api/v1/artists/me/verification-status'),
    retry: false,
  });
}

export function usePendingVerifications(page = 1, limit = 20) {
  return useQuery<PendingVerificationsResponse>({
    queryKey: ['artists', 'pending', page, limit],
    queryFn: () =>
      apiFetch<PendingVerificationsResponse>(
        `/api/v1/artists/pending?page=${page}&limit=${limit}`,
      ),
  });
}

export function useReviewVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: ReviewVerificationInput) =>
      apiFetch<ArtistProfile>(`/api/v1/artists/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['artists', 'pending'] });
    },
  });
}

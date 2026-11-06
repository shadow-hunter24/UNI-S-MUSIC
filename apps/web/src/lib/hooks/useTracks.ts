import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  TrackDto,
  UploadInitResponseDto,
  UploadFinalizeResponseDto,
  PlayResponseDto,
  CoverUploadResponseDto,
} from '@unis-music/contracts';

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

interface CreateTrackInput {
  title: string;
  genreId?: string;
  description?: string;
  explicit?: boolean;
  releaseDate?: string;
  contentType?: string;
}

interface UpdateTrackInput {
  id: string;
  title?: string;
  genreId?: string;
  description?: string;
  explicit?: boolean;
  releaseDate?: string;
}

interface UploadCoverInput {
  trackId: string;
  file: File;
}

interface AddCreditInput {
  trackId: string;
  name: string;
  role: string;
  userId?: string;
}

interface RecordPlayInput {
  trackId: string;
  clientPlayId: string;
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

// Artist's own tracks (all statuses)
export function useMyTracks() {
  return useQuery({
    queryKey: ['tracks', 'me'],
    queryFn: () => apiFetch<TracksResponse>('/api/v1/tracks/me'),
  });
}

// Init upload: creates Track + returns presigned PUT URL
export function useInitUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTrackInput) =>
      apiFetch<UploadInitResponseDto>('/api/v1/tracks', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tracks', 'me'] });
    },
  });
}

// Finalize upload after XHR PUT completes
export function useFinalizeUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) =>
      apiFetch<UploadFinalizeResponseDto>(`/api/v1/tracks/${trackId}/finalize`, {
        method: 'POST',
      }),
    onSuccess: (_data, trackId) => {
      void queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      void queryClient.invalidateQueries({ queryKey: ['tracks', 'me'] });
    },
  });
}

// Update metadata
export function useUpdateTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateTrackInput) =>
      apiFetch<TrackDto>(`/api/v1/tracks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['track', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['tracks', 'me'] });
    },
  });
}

// Cover upload (FormData multipart) — uses fetch directly (not apiFetch) for FormData
export function useUploadCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, file }: UploadCoverInput) => {
      const formData = new FormData();
      formData.append('file', file);
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${API_BASE}/api/v1/tracks/${trackId}/cover`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = await res.json() as { message?: string };
          message = body?.message ?? message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }
      return res.json() as Promise<CoverUploadResponseDto>;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['track', variables.trackId] });
      void queryClient.invalidateQueries({ queryKey: ['tracks', 'me'] });
    },
  });
}

// Add credit row
export function useAddCredit() {
  return useMutation({
    mutationFn: ({ trackId, ...dto }: AddCreditInput) =>
      apiFetch<unknown>(`/api/v1/tracks/${trackId}/credits`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  });
}

// Submit for review
export function useSubmitTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) =>
      apiFetch<TrackDto>(`/api/v1/tracks/${trackId}/submit`, { method: 'POST' }),
    onSuccess: (_data, trackId) => {
      void queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      void queryClient.invalidateQueries({ queryKey: ['tracks', 'me'] });
    },
  });
}

// Moderator publish
export function usePublishTrack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) =>
      apiFetch<TrackDto>(`/api/v1/tracks/${trackId}/publish`, { method: 'POST' }),
    onSuccess: (_data, trackId) => {
      void queryClient.invalidateQueries({ queryKey: ['track', trackId] });
      void queryClient.invalidateQueries({ queryKey: ['tracks'] });
    },
  });
}

// Record play event (fire-and-forget at call site)
export function useRecordPlay() {
  return useMutation({
    mutationFn: ({ trackId, clientPlayId }: RecordPlayInput) =>
      apiFetch<PlayResponseDto>(`/api/v1/tracks/${trackId}/play`, {
        method: 'POST',
        body: JSON.stringify({ clientPlayId }),
      }),
  });
}

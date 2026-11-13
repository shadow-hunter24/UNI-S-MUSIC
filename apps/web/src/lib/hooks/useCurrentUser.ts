import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AuthUser } from '@/lib/auth';

export interface UserProfile extends AuthUser {
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useCurrentUser() {
  return useQuery<UserProfile | null>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      try {
        return await apiFetch<UserProfile>('/api/v1/users/me');
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min — user profile doesn't change often
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: { fullName?: string; bio?: string; avatarUrl?: string }) =>
      apiFetch<UserProfile>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(dto),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', 'me'], updated);
    },
  });
}

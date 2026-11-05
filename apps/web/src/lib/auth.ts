import { apiFetch, ApiError } from './api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  emailVerified: boolean;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>('/api/v1/users/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    return null;
  }
}

export async function logout(): Promise<void> {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' });
}

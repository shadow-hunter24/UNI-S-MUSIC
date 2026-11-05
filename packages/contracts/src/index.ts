export type ApiResponse<T> =
  | { data: T; success: true }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

export enum UserRole {
  LISTENER = 'LISTENER',
  ARTIST = 'ARTIST',
  MODERATOR = 'MODERATOR',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
}

export enum TrackStatus {
  DRAFT = 'DRAFT',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REJECTED = 'REJECTED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  TAKEN_DOWN = 'TAKEN_DOWN',
  ARCHIVED = 'ARCHIVED',
}

export interface UserDto {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface TrackDto {
  id: string;
  title: string;
  status: TrackStatus;
  artistId: string;
  durationSeconds?: number;
  explicit: boolean;
  playCount: number;
  createdAt: string;
}

export interface ArtistProfileDto {
  id: string;
  userId: string;
  stageName: string;
  bio?: string;
  imageUrl?: string;
  isVerified: boolean;
}

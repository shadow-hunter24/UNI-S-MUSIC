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

export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
  slug: string;
  artistId: string;
  artistName: string;
  coverImageUrl?: string;
  durationSeconds?: number;
  playCount: number;
  likeCount: number;
  explicit: boolean;
  releaseDate?: string;
  genreId?: string;
  genreName?: string;
  status: TrackStatus;
  // NOTE: audioUrl is intentionally omitted — Phase 4 only
}

export interface ArtistProfileDto {
  id: string;
  stageName: string;
  bio?: string;
  imageUrl?: string;
  headerImageUrl?: string;
  totalFollowers: number;
  totalTracks: number;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
}

export interface GenreDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  trackCount?: number;
}

export interface PlaylistDto {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  coverImageUrl?: string;
  trackCount: number;
  userId: string;
}

export interface FeedDto {
  trending: TrackDto[];
  newReleases: TrackDto[];
  byGenre: { genre: GenreDto; tracks: TrackDto[] }[];
  fromFollowing?: TrackDto[];
}

export interface TrackCreditDto {
  id: string;
  trackId: string;
  userId?: string;
  name: string;
  role: string;
}

export interface PlaylistTrackDto {
  playlistId: string;
  trackId: string;
  position: number;
  addedAt: string;
  track?: TrackDto;
}

export interface FollowDto {
  followerId: string;
  artistProfileId: string;
  createdAt: string;
}

export interface SearchResultDto {
  tracks: TrackDto[];
  artists: ArtistProfileDto[];
  genres: GenreDto[];
}

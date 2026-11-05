import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TracksService } from './tracks.service';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    genre: {
      findUnique: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    like: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
    ...overrides,
  };
}

function makeService(prismaOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  // @ts-expect-error - injecting mocks
  const service = new TracksService(prisma);
  return { service, prisma };
}

const mockTrack = {
  id: 'track-1',
  title: 'Test Track',
  slug: 'test-track',
  artistProfileId: 'artist-1',
  coverImageUrl: null,
  durationSeconds: 180,
  playCount: BigInt(100),
  likeCount: 5,
  explicit: false,
  releaseDate: new Date('2024-01-01'),
  genreId: 'genre-1',
  status: 'PUBLISHED',
  artistProfile: { stageName: 'Test Artist' },
  genre: { name: 'Afrobeats' },
};

describe('TracksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublishedTracks', () => {
    it('filters status=PUBLISHED by default', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([mockTrack]);

      await service.getPublishedTracks({});

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('returns mapped tracks with playCount as number', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([mockTrack]);

      const result = await service.getPublishedTracks({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].playCount).toBe(100);
      expect(typeof result.items[0].playCount).toBe('number');
    });

    it('applies genre filter when genre slug is provided', async () => {
      const { service, prisma } = makeService();
      prisma.genre.findUnique.mockResolvedValue({ id: 'genre-1', slug: 'afrobeats' });
      prisma.track.findMany.mockResolvedValue([mockTrack]);

      await service.getPublishedTracks({ genre: 'afrobeats' });

      expect(prisma.genre.findUnique).toHaveBeenCalledWith({ where: { slug: 'afrobeats' } });
      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ genreId: 'genre-1' }),
        }),
      );
    });

    it('applies search filter when search is provided', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([]);

      await service.getPublishedTracks({ search: 'love' });

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'love', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('returns cursor pagination with nextCursor when there are more results', async () => {
      const { service, prisma } = makeService();
      const tracks = Array.from({ length: 21 }, (_, i) => ({ ...mockTrack, id: `track-${i}` }));
      prisma.track.findMany.mockResolvedValue(tracks);

      const result = await service.getPublishedTracks({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('track-19');
    });
  });

  describe('getTrackById', () => {
    it('returns a PUBLISHED track', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({ ...mockTrack, credits: [] });

      const result = await service.getTrackById('track-1');

      expect(result.id).toBe('track-1');
      expect(result).not.toHaveProperty('audioUrl');
    });

    it('throws NotFoundException for non-existent track', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue(null);

      await expect(service.getTrackById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when track is not PUBLISHED', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({ ...mockTrack, status: 'DRAFT', credits: [] });

      await expect(service.getTrackById('track-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('likeTrack', () => {
    it('creates a like and returns liked=true', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue(mockTrack);
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.likeTrack('user-1', 'track-1');

      expect(result).toEqual({ liked: true });
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('throws ConflictException when track is already liked', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue(mockTrack);
      prisma.like.findUnique.mockResolvedValue({ userId: 'user-1', trackId: 'track-1' });

      await expect(service.likeTrack('user-1', 'track-1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when track is not found', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue(null);

      await expect(service.likeTrack('user-1', 'track-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlikeTrack', () => {
    it('deletes a like and returns liked=false', async () => {
      const { service, prisma } = makeService();
      prisma.like.findUnique.mockResolvedValue({ userId: 'user-1', trackId: 'track-1' });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.unlikeTrack('user-1', 'track-1');

      expect(result).toEqual({ liked: false });
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException when like does not exist', async () => {
      const { service, prisma } = makeService();
      prisma.like.findUnique.mockResolvedValue(null);

      await expect(service.unlikeTrack('user-1', 'track-1')).rejects.toThrow(NotFoundException);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedService } from './feed.service';

const mockTrack = (id: string, playCount = 0) => ({
  id,
  title: `Track ${id}`,
  slug: `track-${id}`,
  artistProfileId: 'artist-1',
  coverImageUrl: null,
  durationSeconds: 180,
  playCount: BigInt(playCount),
  likeCount: 0,
  explicit: false,
  releaseDate: new Date('2024-01-01'),
  genreId: 'genre-1',
  status: 'PUBLISHED',
  artistProfile: { stageName: 'Test Artist' },
  genre: { name: 'Afrobeats' },
});

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    track: {
      findMany: vi.fn(),
    },
    genre: {
      findMany: vi.fn(),
    },
    follow: {
      findMany: vi.fn(),
    },
    ...overrides,
  };
}

function makeService(prismaOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  // @ts-expect-error - injecting mocks
  const service = new FeedService(prisma);
  return { service, prisma };
}

describe('FeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeed', () => {
    it('returns trending and newReleases', async () => {
      const { service, prisma } = makeService();
      const track = mockTrack('t1', 50);
      prisma.track.findMany.mockResolvedValue([track]);
      prisma.genre.findMany.mockResolvedValue([{ id: 'g1', name: 'Afrobeats', slug: 'afrobeats', imageUrl: null }]);

      const result = await service.getFeed();

      expect(result).toHaveProperty('trending');
      expect(result).toHaveProperty('newReleases');
      expect(result).toHaveProperty('byGenre');
      expect(result.fromFollowing).toBeUndefined();
    });

    it('includes fromFollowing when userId is provided and follows exist', async () => {
      const { service, prisma } = makeService();
      const track = mockTrack('t1', 50);
      prisma.track.findMany.mockResolvedValue([track]);
      prisma.genre.findMany.mockResolvedValue([]);
      prisma.follow.findMany.mockResolvedValue([{ followingArtistId: 'artist-1' }]);

      const result = await service.getFeed('user-1');

      expect(result.fromFollowing).toBeDefined();
      expect(Array.isArray(result.fromFollowing)).toBe(true);
    });

    it('does not include fromFollowing when userId is not provided', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([]);
      prisma.genre.findMany.mockResolvedValue([]);

      const result = await service.getFeed();

      expect(result.fromFollowing).toBeUndefined();
    });
  });

  describe('getTrending', () => {
    it('returns only recent tracks when there are enough', async () => {
      const { service, prisma } = makeService();
      const tracks = Array.from({ length: 20 }, (_, i) => mockTrack(`t${i}`, 100));
      prisma.track.findMany.mockResolvedValue(tracks);

      const result = await service.getTrending(20);

      // findMany called once (recent only)
      expect(prisma.track.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(20);
    });

    it('merges recent + all-time fillers when recent is insufficient', async () => {
      const { service, prisma } = makeService();
      const recentTracks = [mockTrack('recent-1', 50)];
      const fillerTracks = [mockTrack('alltime-1', 200), mockTrack('alltime-2', 150)];

      // First call returns recent tracks (insufficient); second call returns fillers
      prisma.track.findMany
        .mockResolvedValueOnce(recentTracks) // recent
        .mockResolvedValueOnce(fillerTracks); // all-time fillers

      const result = await service.getTrending(3);

      expect(prisma.track.findMany).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3);
      // Recent track comes first
      expect(result[0]!.id).toBe('recent-1');
      // No duplicate ids
      const ids = result.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('excludes recent ids from fillers to prevent duplicates', async () => {
      const { service, prisma } = makeService();
      const recentTracks = [mockTrack('t1', 50)];
      const fillerTracks = [mockTrack('t2', 200)];

      prisma.track.findMany
        .mockResolvedValueOnce(recentTracks)
        .mockResolvedValueOnce(fillerTracks);

      const result = await service.getTrending(2);

      // The second findMany call should exclude recent ids
      const secondCall = prisma.track.findMany.mock.calls[1]!;
      expect(secondCall[0]).toMatchObject({
        where: expect.objectContaining({ id: { notIn: ['t1'] } }),
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getNewReleases', () => {
    it('calls findMany with status PUBLISHED and orders by releaseDate desc', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([mockTrack('t1')]);

      const result = await service.getNewReleases(10);

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PUBLISHED' },
          orderBy: { releaseDate: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });
});

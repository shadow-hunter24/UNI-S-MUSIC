import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    track: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    artistProfile: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    genre: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
}

function makeService(prismaOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  // @ts-expect-error - injecting mocks
  const service = new SearchService(prisma);
  return { service, prisma };
}

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('throws BadRequestException when query is a single character', async () => {
      const { service } = makeService();
      await expect(service.search('a')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when query is empty string', async () => {
      const { service } = makeService();
      await expect(service.search('')).rejects.toThrow(BadRequestException);
    });

    it('calls prisma with correct filters and returns combined results', async () => {
      const { service, prisma } = makeService();

      const result = await service.search('test');

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
      expect(prisma.artistProfile.findMany).toHaveBeenCalledOnce();
      expect(prisma.genre.findMany).toHaveBeenCalledOnce();
      expect(result).toHaveProperty('tracks');
      expect(result).toHaveProperty('artists');
      expect(result).toHaveProperty('genres');
    });

    it('track search always filters status=PUBLISHED', async () => {
      const { service, prisma } = makeService();

      await service.searchTracks('love');

      expect(prisma.track.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
          }),
        }),
      );
    });

    it('artist search queries stageName case-insensitively', async () => {
      const { service, prisma } = makeService();

      await service.searchArtists('burna');

      expect(prisma.artistProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stageName: { contains: 'burna', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('genre search queries name case-insensitively', async () => {
      const { service, prisma } = makeService();

      await service.searchGenres('afro');

      expect(prisma.genre.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'afro', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('returns empty arrays when nothing matches', async () => {
      const { service, prisma } = makeService();
      prisma.track.findMany.mockResolvedValue([]);
      prisma.artistProfile.findMany.mockResolvedValue([]);
      prisma.genre.findMany.mockResolvedValue([]);

      const result = await service.search('xyznotfound');

      expect(result.tracks).toEqual([]);
      expect(result.artists).toEqual([]);
      expect(result.genres).toEqual([]);
    });
  });
});

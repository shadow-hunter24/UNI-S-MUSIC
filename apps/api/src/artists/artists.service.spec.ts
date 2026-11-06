import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ArtistsService } from './artists.service';

const mockProfile = {
  id: 'profile-1',
  userId: 'user-1',
  stageName: 'Test Artist',
  bio: null,
  imageUrl: null,
  headerImageUrl: null,
  country: null,
  websiteUrl: null,
  totalFollowers: 0,
  totalTracks: 0,
  isVerified: false,
  verificationStatus: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildPrisma(overrides: Record<string, unknown> = {}) {
  return {
    artistProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
    follow: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
    ...overrides,
  };
}

function buildStorage(overrides: Record<string, unknown> = {}) {
  return {
    resolveCoverUrl: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeService(prismaOverrides = {}, storageOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  const storage = buildStorage(storageOverrides);
  // @ts-expect-error - injecting mocks
  const service = new ArtistsService(prisma, storage);
  return { service, prisma, storage };
}

describe('ArtistsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apply()', () => {
    it('throws ConflictException when artist profile already exists', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(mockProfile);

      await expect(service.apply('user-1', { stageName: 'New Artist' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('wraps artistProfile.create and user.update in a single $transaction (Fix A)', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(null);
      // $transaction returns array [profile, userUpdate]
      prisma.$transaction.mockResolvedValue([mockProfile, {}]);

      const result = await service.apply('user-1', { stageName: 'Test Artist' });

      // Should use $transaction instead of two separate top-level awaits
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      // Receives array of two operations
      const txArg = prisma.$transaction.mock.calls[0]![0];
      expect(Array.isArray(txArg)).toBe(true);
      expect(txArg).toHaveLength(2);
      // Returns the profile (first element)
      expect(result).toEqual(mockProfile);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when artist not found', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns artist with recentTracks and topTracks', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(mockProfile);
      prisma.track.findMany.mockResolvedValue([]);

      const result = await service.findById('profile-1');

      expect(result).toHaveProperty('id', 'profile-1');
      expect(result).toHaveProperty('recentTracks');
      expect(result).toHaveProperty('topTracks');
    });
  });
});

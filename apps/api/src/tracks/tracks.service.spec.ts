import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
      create: vi.fn(),
      count: vi.fn(),
    },
    artistProfile: {
      findUnique: vi.fn(),
    },
    trackCredit: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    playbackEvent: {
      create: vi.fn(),
    },
    mediaAsset: {
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
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

function buildStorageService(overrides: Record<string, unknown> = {}) {
  return {
    generateAudioKey: vi.fn().mockReturnValue('audio/track-1/uuid.mp3'),
    generateCoverKey: vi.fn().mockReturnValue('covers/track-1/uuid.jpg'),
    extFromMimeType: vi.fn().mockReturnValue('mp3'),
    createPresignedPut: vi.fn().mockResolvedValue({ url: 'https://r2.example.com/put', key: 'audio/track-1/uuid.mp3' }),
    createPresignedGet: vi.fn().mockResolvedValue('https://r2.example.com/get'),
    headObject: vi.fn(),
    putObject: vi.fn().mockResolvedValue(undefined),
    resolveCoverUrl: vi.fn().mockImplementation((v: string | null | undefined) =>
      Promise.resolve(v ? (v.startsWith('http') ? v : `https://r2.example.com/${v}`) : undefined),
    ),
    ...overrides,
  };
}

function buildQueueService(overrides: Record<string, unknown> = {}) {
  return {
    enqueueAudioProcessing: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeService(prismaOverrides = {}, storageOverrides = {}, queueOverrides = {}) {
  const prisma = buildPrisma(prismaOverrides);
  const storage = buildStorageService(storageOverrides);
  const queue = buildQueueService(queueOverrides);
  // @ts-expect-error - injecting mocks
  const service = new TracksService(prisma, storage, queue);
  return { service, prisma, storage, queue };
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
  processingError: null,
  processedAt: new Date('2024-01-01'),
  audioUrl: 'audio/track-1/uuid.mp3',
  artistProfile: { stageName: 'Test Artist' },
  genre: { name: 'Afrobeats' },
};

const mockArtistProfile = {
  id: 'artist-1',
  userId: 'user-1',
  stageName: 'Test Artist',
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
      expect(result.items[0]!.playCount).toBe(100);
      expect(typeof result.items[0]!.playCount).toBe('number');
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

    it('throws NotFoundException for unknown genre slug (Fix B)', async () => {
      const { service, prisma } = makeService();
      prisma.genre.findUnique.mockResolvedValue(null);

      await expect(service.getPublishedTracks({ genre: 'nonexistent' })).rejects.toThrow(
        NotFoundException,
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
    it('returns a PUBLISHED track without audioUrl', async () => {
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

  describe('createTrack', () => {
    it('creates track with status UPLOADING and returns uploadUrl/storageKey/expiresAt', async () => {
      const { service, prisma, storage } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(mockArtistProfile);
      prisma.track.create.mockResolvedValue({ ...mockTrack, status: 'UPLOADING', audioUrl: '' });
      prisma.track.update.mockResolvedValue({ ...mockTrack, status: 'UPLOADING', audioUrl: 'audio/track-1/uuid.mp3' });

      const result = await service.createTrack('user-1', {
        title: 'Test Track',
        contentType: 'audio/mpeg',
      });

      expect(prisma.track.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'UPLOADING' }),
        }),
      );
      expect(result).toHaveProperty('trackId');
      expect(result).toHaveProperty('uploadUrl');
      expect(result).toHaveProperty('storageKey');
      expect(result).toHaveProperty('expiresAt');
      expect(storage.createPresignedPut).toHaveBeenCalled();
    });

    it('throws NotFoundException when artistProfile not found for userId', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(null);

      await expect(service.createTrack('user-1', { title: 'Test' })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when genreId is provided but genre not found', async () => {
      const { service, prisma } = makeService();
      prisma.artistProfile.findUnique.mockResolvedValue(mockArtistProfile);
      prisma.genre.findUnique.mockResolvedValue(null);

      await expect(
        service.createTrack('user-1', { title: 'Test', genreId: 'nonexistent-genre' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('finalizeUpload', () => {
    it('throws ConflictException when headObject returns null (file not found)', async () => {
      const { service, prisma, storage } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } }) // assertOwnsTrack
        .mockResolvedValueOnce({ status: 'UPLOADING', audioUrl: 'audio/track-1/uuid.mp3' }); // main load
      storage.headObject.mockResolvedValue(null);

      await expect(service.finalizeUpload('user-1', 'track-1')).rejects.toThrow(ConflictException);
    });

    it('enqueues job and returns PROCESSING when headObject succeeds', async () => {
      const { service, prisma, storage, queue } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } })
        .mockResolvedValueOnce({ status: 'UPLOADING', audioUrl: 'audio/track-1/uuid.mp3' });
      storage.headObject.mockResolvedValue({ size: 1024, contentType: 'audio/mpeg', etag: 'abc123' });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.finalizeUpload('user-1', 'track-1');

      expect(result.status).toBe('PROCESSING');
      expect(queue.enqueueAudioProcessing).toHaveBeenCalledWith(
        expect.objectContaining({ storageKey: 'audio/track-1/uuid.mp3' }),
      );
    });

    it('throws BadRequestException when file exceeds 150MB', async () => {
      const { service, prisma, storage } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } })
        .mockResolvedValueOnce({ status: 'UPLOADING', audioUrl: 'audio/track-1/uuid.mp3' });
      storage.headObject.mockResolvedValue({
        size: 160 * 1024 * 1024,
        contentType: 'audio/mpeg',
        etag: 'big',
      });

      await expect(service.finalizeUpload('user-1', 'track-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('assertOwnsTrack (via mutations)', () => {
    it('throws ForbiddenException when userId does not match track owner', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({
        artistProfile: { userId: 'other-user' },
      });

      await expect(service.submitTrack('user-1', 'track-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when track not found in assertOwnsTrack', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue(null);

      await expect(service.submitTrack('user-1', 'track-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitTrack', () => {
    it('throws ConflictException when status is not DRAFT', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } })
        .mockResolvedValueOnce({ status: 'PENDING_REVIEW', processedAt: new Date(), durationSeconds: 180 });

      await expect(service.submitTrack('user-1', 'track-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when processedAt is null (not processed)', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } })
        .mockResolvedValueOnce({ status: 'DRAFT', processedAt: null, durationSeconds: null });

      await expect(service.submitTrack('user-1', 'track-1')).rejects.toThrow(ConflictException);
    });

    it('updates to PENDING_REVIEW for valid DRAFT + processedAt', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique
        .mockResolvedValueOnce({ artistProfile: { userId: 'user-1' } })
        .mockResolvedValueOnce({ status: 'DRAFT', processedAt: new Date(), durationSeconds: 180 });
      prisma.track.update.mockResolvedValue({ ...mockTrack, status: 'PENDING_REVIEW' });

      await service.submitTrack('user-1', 'track-1');

      expect(prisma.track.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING_REVIEW' }) }),
      );
    });
  });

  describe('publishTrack', () => {
    it('throws ConflictException when status is not PENDING_REVIEW', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({
        status: 'DRAFT',
        processedAt: new Date(),
        releaseDate: null,
      });

      await expect(service.publishTrack('track-1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when processedAt is null', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({
        status: 'PENDING_REVIEW',
        processedAt: null,
        releaseDate: null,
      });

      await expect(service.publishTrack('track-1')).rejects.toThrow(ConflictException);
    });

    it('updates to PUBLISHED for valid PENDING_REVIEW + processedAt', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({
        status: 'PENDING_REVIEW',
        processedAt: new Date(),
        releaseDate: null,
      });
      prisma.track.update.mockResolvedValue({ ...mockTrack, status: 'PUBLISHED' });

      await service.publishTrack('track-1');

      expect(prisma.track.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) }),
      );
    });
  });

  describe('recordPlay', () => {
    const mockReq = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as unknown as import('express').Request;

    it('returns played:true and incremented playCount for a new clientPlayId', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({ id: 'track-1', status: 'PUBLISHED', playCount: BigInt(10) });
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.recordPlay('user-1', 'track-1', { clientPlayId: 'uuid-1' }, mockReq);

      expect(result).toEqual({ played: true, playCount: 11 });
    });

    it('returns played:false for duplicate clientPlayId (P2002)', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({ id: 'track-1', status: 'PUBLISHED', playCount: BigInt(10) });
      prisma.$transaction.mockRejectedValue({ code: 'P2002' });

      const result = await service.recordPlay('user-1', 'track-1', { clientPlayId: 'uuid-1' }, mockReq);

      expect(result).toEqual({ played: false, playCount: 10 });
    });

    it('throws NotFoundException for a non-PUBLISHED track', async () => {
      const { service, prisma } = makeService();
      prisma.track.findUnique.mockResolvedValue({ id: 'track-1', status: 'DRAFT', playCount: BigInt(0) });

      await expect(service.recordPlay(null, 'track-1', { clientPlayId: 'uuid-1' }, mockReq)).rejects.toThrow(
        NotFoundException,
      );
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

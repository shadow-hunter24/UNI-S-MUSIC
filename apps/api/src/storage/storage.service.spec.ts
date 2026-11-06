import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService } from './storage.service';

// Mock AWS SDK modules before any imports use them
vi.mock('@aws-sdk/client-s3', async () => {
  const mockSend = vi.fn();
  class MockS3Client {
    send = mockSend;
    static _mockSend = mockSend;
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand: class PutObjectCommand { constructor(public input: unknown) {} },
    GetObjectCommand: class GetObjectCommand { constructor(public input: unknown) {} },
    HeadObjectCommand: class HeadObjectCommand { constructor(public input: unknown) {} },
    NoSuchKey: class NoSuchKey extends Error {
      name = 'NoSuchKey';
      constructor() { super('NoSuchKey'); }
    },
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://presigned.example.com/key'),
}));

function makeService() {
  const service = new StorageService();
  service.onModuleInit();
  return service;
}

describe('StorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateAudioKey', () => {
    it('starts with audio/, contains trackId, has correct ext for audio/mpeg', () => {
      const service = makeService();
      const key = service.generateAudioKey('track-123', 'mp3');
      expect(key).toMatch(/^audio\/track-123\/.+\.mp3$/);
    });

    it('generates unique keys on repeated calls', () => {
      const service = makeService();
      const key1 = service.generateAudioKey('track-1', 'mp3');
      const key2 = service.generateAudioKey('track-1', 'mp3');
      expect(key1).not.toBe(key2);
    });
  });

  describe('generateCoverKey', () => {
    it('starts with covers/, contains trackId', () => {
      const service = makeService();
      const key = service.generateCoverKey('track-123', 'jpg');
      expect(key).toMatch(/^covers\/track-123\//);
    });
  });

  describe('resolveCoverUrl', () => {
    it('returns undefined for null/undefined', async () => {
      const service = makeService();
      const result = await service.resolveCoverUrl(null);
      expect(result).toBeUndefined();
    });

    it('returns value as-is when it starts with http (no S3 presign call)', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const service = makeService();
      const result = await service.resolveCoverUrl('https://cdn.example.com/cover.jpg');
      expect(result).toBe('https://cdn.example.com/cover.jpg');
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('presigns an R2 key (does not start with http) and returns signed URL', async () => {
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const service = makeService();
      const result = await service.resolveCoverUrl('covers/track-1/uuid.jpg');
      expect(result).toBe('https://presigned.example.com/key');
      expect(getSignedUrl).toHaveBeenCalledOnce();
    });
  });

  describe('headObject', () => {
    it('returns null when S3 sends throws with name=NotFound', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const notFoundErr = Object.assign(new Error('Not Found'), { name: 'NotFound' });
      // Get the mock's send method and override it
      const instance = new (S3Client as unknown as new () => { send: ReturnType<typeof vi.fn> })();
      instance.send.mockRejectedValueOnce(notFoundErr);

      const service = new StorageService();
      service.onModuleInit();
      // Inject our mock instance
      (service as unknown as { client: unknown }).client = instance;

      const result = await service.headObject('audio/key');
      expect(result).toBeNull();
    });

    it('returns size, contentType, etag when S3 succeeds', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3');
      const instance = new (S3Client as unknown as new () => { send: ReturnType<typeof vi.fn> })();
      instance.send.mockResolvedValueOnce({
        ContentLength: 1024,
        ContentType: 'audio/mpeg',
        ETag: '"abc123"',
      });

      const service = new StorageService();
      service.onModuleInit();
      (service as unknown as { client: unknown }).client = instance;

      const result = await service.headObject('audio/key');
      expect(result).toEqual({ size: 1024, contentType: 'audio/mpeg', etag: 'abc123' });
    });
  });
});

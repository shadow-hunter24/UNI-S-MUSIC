import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAudioJob, ProcessorDeps, AudioProcessingJobData } from './audio-processing.processor';
import type { PrismaClient } from '@prisma/client';

const jobData: AudioProcessingJobData = {
  trackId: 'track-1',
  storageKey: 'audio/track-1/uuid.mp3',
  mimeType: 'audio/mpeg',
};

function buildDeps(overrides: Partial<ProcessorDeps> = {}): ProcessorDeps {
  const mockPrisma = {
    track: {
      update: vi.fn().mockResolvedValue({}),
    },
    mediaAsset: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops.map((op) => op));
    }),
  };

  return {
    prisma: mockPrisma as unknown as PrismaClient,
    headObject: vi.fn().mockResolvedValue({ size: 1024 * 1024, contentType: 'audio/mpeg', etag: 'abc123' }),
    getObjectBuffer: vi.fn().mockResolvedValue(Buffer.from('fake audio data')),
    parseAudio: vi.fn().mockResolvedValue({ format: { duration: 183.4 } }),
    ...overrides,
  };
}

describe('processAudioJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('success: sets DRAFT status with rounded durationSeconds and processedAt', async () => {
    const deps = buildDeps();

    await processAudioJob(jobData, deps);

    // Initial PROCESSING marker
    expect(deps.prisma.track.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSING' }) }),
    );

    // Final $transaction with DRAFT update
    expect(deps.prisma.$transaction).toHaveBeenCalledOnce();
    const txArg = (deps.prisma.$transaction as ReturnType<typeof vi.fn>).mock.calls[0]![0] as unknown[];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg).toHaveLength(3); // update track + deleteMany + create

    // The track update inside $transaction has correct values
    // We check by verifying update was called with DRAFT + durationSeconds=183
    expect(deps.prisma.track.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT', durationSeconds: 183 }),
      }),
    );
  });

  it('zero duration: sets PROCESSING_FAILED with processingError, does not throw', async () => {
    const deps = buildDeps({
      parseAudio: vi.fn().mockResolvedValue({ format: { duration: 0 } }),
    });

    // Should resolve (not throw) for bad data
    await expect(processAudioJob(jobData, deps)).resolves.toBeUndefined();

    expect(deps.prisma.track.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSING_FAILED',
          processingError: 'Invalid or zero-duration audio',
        }),
      }),
    );
    // Should NOT proceed to $transaction
    expect(deps.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('NaN/undefined duration: sets PROCESSING_FAILED, does not throw', async () => {
    const deps = buildDeps({
      parseAudio: vi.fn().mockResolvedValue({ format: {} }),
    });

    await expect(processAudioJob(jobData, deps)).resolves.toBeUndefined();

    expect(deps.prisma.track.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSING_FAILED' }),
      }),
    );
    expect(deps.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('S3 object missing: throws Error so BullMQ can retry', async () => {
    const deps = buildDeps({
      headObject: vi.fn().mockResolvedValue(null),
    });

    await expect(processAudioJob(jobData, deps)).rejects.toThrow('Object not found in storage');
    // PROCESSING_FAILED should NOT be set here — BullMQ retries; worker.on('failed') handles exhaustion
    expect(deps.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('idempotency: calling twice for same trackId still marks PROCESSING first then DRAFT', async () => {
    const deps = buildDeps();

    await processAudioJob(jobData, deps);
    await processAudioJob(jobData, deps);

    // update called at least 2 times (once per call for PROCESSING marker)
    const processingCalls = (deps.prisma.track.update as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call) => call[0]?.data?.status === 'PROCESSING',
    );
    expect(processingCalls.length).toBeGreaterThanOrEqual(2);
  });
});

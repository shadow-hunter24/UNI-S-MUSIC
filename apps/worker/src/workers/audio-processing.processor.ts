import type { PrismaClient } from '@prisma/client';

export interface AudioProcessingJobData {
  trackId: string;
  storageKey: string;
  mimeType: string;
}

export interface ProcessorDeps {
  prisma: PrismaClient;
  headObject: (key: string) => Promise<{ size: number; contentType: string; etag: string } | null>;
  getObjectBuffer: (key: string) => Promise<Buffer>;
  parseAudio: (buf: Buffer, mimeType: string) => Promise<{ format: { duration?: number } }>;
}

export async function processAudioJob(
  data: AudioProcessingJobData,
  deps: ProcessorDeps,
): Promise<void> {
  const { prisma, headObject, getObjectBuffer, parseAudio } = deps;
  const { trackId, storageKey, mimeType } = data;

  // 1. Mark as PROCESSING (idempotent start marker)
  await prisma.track.update({
    where: { id: trackId },
    data: { status: 'PROCESSING', processingError: null },
  });

  // 2. Verify the object exists
  const head = await headObject(storageKey);
  if (!head) {
    // Transient failure — BullMQ will retry; on exhaustion the worker.on('failed') handler sets PROCESSING_FAILED
    throw new Error(`Object not found in storage: ${storageKey}`);
  }

  // 3. Fetch the audio as a buffer
  const buf = await getObjectBuffer(storageKey);

  // 4. Extract metadata
  const meta = await parseAudio(buf, mimeType);

  // 5. Validate duration
  const dur = meta.format.duration;
  if (!dur || dur <= 0 || !isFinite(dur)) {
    await prisma.track.update({
      where: { id: trackId },
      data: { status: 'PROCESSING_FAILED', processingError: 'Invalid or zero-duration audio' },
    });
    // Do NOT throw — bad data won't fix itself on retry
    return;
  }

  // 6. Transcode gate (disabled by default for MVP)
  if (process.env['AUDIO_TRANSCODE_ENABLED'] === 'true') {
    console.info('[worker] transcode enabled — future implementation');
  } else {
    console.info('[worker] transcode disabled, skipping');
  }

  // 7. Persist success in one transaction
  await prisma.$transaction([
    prisma.track.update({
      where: { id: trackId },
      data: {
        durationSeconds: Math.round(dur),
        status: 'DRAFT',
        processedAt: new Date(),
        processingError: null,
      },
    }),
    // Delete any existing AUDIO asset for idempotency, then create a new one
    prisma.mediaAsset.deleteMany({ where: { trackId, assetType: 'AUDIO' } }),
    prisma.mediaAsset.create({
      data: {
        trackId,
        assetType: 'AUDIO',
        storageKey,
        mimeType,
        fileSizeBytes: BigInt(head.size),
        checksum: head.etag,
      },
    }),
  ]);
}

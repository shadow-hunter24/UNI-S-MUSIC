import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { parseBuffer } from 'music-metadata';
import { createS3Client, headObject as s3HeadObject, getObjectBuffer as s3GetObjectBuffer } from '../storage';
import { processAudioJob, AudioProcessingJobData } from './audio-processing.processor';

const QUEUE_NAME = 'audio-processing';
const S3_BUCKET = process.env['S3_BUCKET'] ?? '';

export function createAudioProcessingWorker(connection: IORedis) {
  const prisma = new PrismaClient();
  const s3 = createS3Client();

  const worker = new Worker<AudioProcessingJobData>(
    QUEUE_NAME,
    async (job: Job<AudioProcessingJobData>) => {
      console.log(`[audio-processing] Processing job ${job.id}:`, job.data);

      await processAudioJob(job.data, {
        prisma,
        headObject: (key) => s3HeadObject(s3, S3_BUCKET, key),
        getObjectBuffer: (key) => s3GetObjectBuffer(s3, S3_BUCKET, key),
        parseAudio: async (buf, mime) => {
          const meta = await parseBuffer(buf, { mimeType: mime });
          return { format: { duration: meta.format.duration } };
        },
      });

      console.log(`[audio-processing] Job ${job.id} completed.`);
    },
    { connection },
  );

  worker.on('completed', (job) =>
    console.log(`[audio-processing] Job ${job.id} succeeded.`),
  );

  worker.on('failed', async (job, err) => {
    console.error(`[audio-processing] Job ${job?.id} failed after all attempts:`, err);
    if (job?.data?.trackId) {
      try {
        await prisma.track.update({
          where: { id: job.data.trackId },
          data: {
            status: 'PROCESSING_FAILED',
            processingError: err.message ?? 'Unknown processing error',
          },
        });
      } catch (dbErr) {
        console.error('[audio-processing] Failed to update track status to PROCESSING_FAILED:', dbErr);
      }
    }
  });

  return worker;
}

import IORedis from 'ioredis';
import { createAudioProcessingWorker } from './workers/audio-processing.worker';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function bootstrap() {
  console.log("Starting Uni's Music workers...");

  const redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

  redis.on('connect', () => console.log('Redis connected'));
  redis.on('error', (err) => console.error('Redis error:', err));

  const audioWorker = createAudioProcessingWorker(redis);
  console.log('[audio-processing] Worker registered.');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down workers...');
    await audioWorker.close();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log("Uni's Music workers running. Waiting for jobs...");
}

bootstrap().catch((err) => {
  console.error('Failed to start workers:', err);
  process.exit(1);
});

import { Global, Module } from '@nestjs/common';
import IORedis from 'ioredis';
import { REDIS_CONNECTION } from './queue.constants';
import { AudioQueueService } from './audio-queue.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: () => {
        return new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
          maxRetriesPerRequest: null,
        });
      },
    },
    AudioQueueService,
  ],
  exports: [AudioQueueService],
})
export class QueueModule {}

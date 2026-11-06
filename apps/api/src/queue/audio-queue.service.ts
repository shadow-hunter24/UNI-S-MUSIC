import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AUDIO_QUEUE, REDIS_CONNECTION, AudioProcessingJobData } from './queue.constants';

@Injectable()
export class AudioQueueService implements OnModuleInit {
  private queue!: Queue<AudioProcessingJobData>;

  constructor(@Inject(REDIS_CONNECTION) private readonly connection: IORedis) {}

  onModuleInit() {
    this.queue = new Queue<AudioProcessingJobData>(AUDIO_QUEUE, {
      connection: this.connection,
    });
  }

  async enqueueAudioProcessing(data: AudioProcessingJobData): Promise<void> {
    await this.queue.add('process', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}

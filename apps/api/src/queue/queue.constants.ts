export const AUDIO_QUEUE = 'audio-processing';
export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

export interface AudioProcessingJobData {
  trackId: string;
  storageKey: string;
  mimeType: string;
}

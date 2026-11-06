import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
];

export const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const AUDIO_MAX_BYTES = 150 * 1024 * 1024; // 150 MB
export const COVER_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const EXT_MAP: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private readonly bucket = process.env['S3_BUCKET'] ?? '';

  onModuleInit() {
    const endpoint = process.env['S3_ENDPOINT'] || undefined;
    this.client = new S3Client({
      ...(endpoint ? { endpoint } : {}),
      region: process.env['S3_REGION'] ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
      },
    });
  }

  generateAudioKey(trackId: string, ext: string): string {
    return `audio/${trackId}/${randomUUID()}.${ext}`;
  }

  generateCoverKey(trackId: string, ext: string): string {
    return `covers/${trackId}/${randomUUID()}.${ext}`;
  }

  extFromMimeType(mimeType: string): string {
    return EXT_MAP[mimeType] ?? 'bin';
  }

  async createPresignedPut(
    key: string,
    contentType: string,
    expiresInSec = 600,
  ): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSec });
    return { url, key };
  }

  async createPresignedGet(key: string, expiresInSec: number): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSec });
  }

  async headObject(
    key: string,
  ): Promise<{ size: number; contentType: string; etag: string } | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? 'application/octet-stream',
        etag: (result.ETag ?? '').replace(/"/g, ''),
      };
    } catch (err) {
      if (err instanceof NoSuchKey || (err as { name?: string }).name === 'NotFound') {
        return null;
      }
      throw err;
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error('Empty body from S3');
    return result.Body as Readable;
  }

  async resolveCoverUrl(value: string | null | undefined): Promise<string | undefined> {
    if (!value) return undefined;
    if (value.startsWith('http')) return value;
    return this.createPresignedGet(value, 3600);
  }
}

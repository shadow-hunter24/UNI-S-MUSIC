/**
 * Minimal S3/R2 helper for the worker.
 * Intentionally duplicates the API StorageService read path to keep the
 * worker independent of the NestJS app. The API owns presign + put;
 * the worker only needs head + get.
 */
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

export function createS3Client(): S3Client {
  const endpoint = process.env['S3_ENDPOINT'] || undefined;
  return new S3Client({
    ...(endpoint ? { endpoint } : {}),
    region: process.env['S3_REGION'] ?? 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env['S3_ACCESS_KEY_ID'] ?? '',
      secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'] ?? '',
    },
  });
}

export async function headObject(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<{ size: number; contentType: string; etag: string } | null> {
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return {
      size: result.ContentLength ?? 0,
      contentType: result.ContentType ?? 'application/octet-stream',
      etag: (result.ETag ?? '').replace(/"/g, ''),
    };
  } catch (err) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function getObjectBuffer(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Buffer> {
  const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error(`Empty body for key: ${key}`);
  // Use SDK v3 transformToByteArray — works in both Node and edge runtimes
  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import { extname } from 'path';
import type { Vertical } from '../types/index.js';

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME || 'image-blaster-assets';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.fbx': 'application/octet-stream',
  '.uasset': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

export async function uploadFile(
  localPath: string,
  projectId: string,
  vertical: Vertical,
  filename: string
): Promise<string> {
  const key = `${vertical}/${projectId}/${filename}`;
  const ext = extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  const stream = createReadStream(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: stream,
      ContentType: contentType,
    })
  );

  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

export async function uploadBuffer(
  buffer: Buffer,
  projectId: string,
  vertical: Vertical,
  filename: string
): Promise<string> {
  const key = `${vertical}/${projectId}/${filename}`;
  const ext = extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

export async function getPresignedDownloadUrl(
  projectId: string,
  vertical: Vertical,
  filename: string,
  expiresInSeconds = 3600
): Promise<string> {
  const key = `${vertical}/${projectId}/${filename}`;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteFile(
  projectId: string,
  vertical: Vertical,
  filename: string
): Promise<void> {
  const key = `${vertical}/${projectId}/${filename}`;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function buildS3Key(vertical: Vertical, projectId: string, filename: string): string {
  return `${vertical}/${projectId}/${filename}`;
}

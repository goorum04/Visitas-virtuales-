import Bull from 'bull';
import type { Vertical } from '../types/index.js';

export interface ImageJobData {
  projectId: string;
  userId: string;
  vertical: Vertical;
  imagePath: string;
  imageUrl: string;
  projectName: string;
}

function buildRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username && url.username !== 'default' ? url.username : undefined,
      tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export const imageQueue = new Bull<ImageJobData>('image-generation', {
  redis: buildRedisConfig(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

imageQueue.on('error', (err) => {
  console.error('[Queue] Error:', err.message);
});

imageQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);
});

imageQueue.on('completed', (job) => {
  console.log(`[Queue] Job ${job.id} completed for project ${job.data.projectId}`);
});

export async function enqueueImageJob(data: ImageJobData): Promise<string> {
  const job = await imageQueue.add(data, {
    priority: getPriority(data.vertical),
  });
  return String(job.id);
}

function getPriority(vertical: Vertical): number {
  // Lower number = higher priority
  const priorities: Record<Vertical, number> = {
    real_estate: 1,
    events: 2,
    retail: 3,
    museum: 4,
    architecture: 5,
    gamedev: 6,
  };
  return priorities[vertical] ?? 5;
}

export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    imageQueue.getWaitingCount(),
    imageQueue.getActiveCount(),
    imageQueue.getCompletedCount(),
    imageQueue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

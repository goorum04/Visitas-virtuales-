import 'dotenv/config';
import { imageQueue } from '../lib/queue.js';
import { updateProjectStatus, saveOutput, incrementUsage } from '../lib/db.js';
import { ImageBlasterOrchestrator } from '../orchestrator.js';

const orchestrator = new ImageBlasterOrchestrator();

console.log('🔧 Image worker started — waiting for jobs...');

imageQueue.process(3, async (job) => {
  const { projectId, userId, vertical, imageUrl, projectName } = job.data;
  console.log(`\n[Worker] Processing: "${projectName}" (${vertical}) — job ${job.id}`);

  try {
    await updateProjectStatus(projectId, 'processing');
    await job.progress(5);

    const result = await orchestrator.processImage(vertical, imageUrl, projectName);
    await job.progress(80);

    // Persist all outputs to DB
    for (const output of result.outputs) {
      await saveOutput(
        projectId,
        output.format,
        output.url || output.path,
        output.size,
        output.metadata
      );
    }
    await job.progress(95);

    await updateProjectStatus(projectId, 'completed');
    await incrementUsage(userId);
    await job.progress(100);

    console.log(`[Worker] ✅ Done: ${result.outputs.length} outputs — project ${projectId}`);
    return { projectId, outputCount: result.outputs.length };
  } catch (err) {
    const message = (err as Error).message;
    console.error(`[Worker] ❌ Failed job ${job.id}: ${message}`);
    await updateProjectStatus(projectId, 'failed', message);
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM — closing queue...');
  await imageQueue.close();
  process.exit(0);
});

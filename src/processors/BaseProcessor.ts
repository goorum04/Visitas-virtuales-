import { generateScene, generateMesh, type OrchestrationResult } from './DirectOrchestrator.js';
import type { ProcessingJob, ProcessingOutput, ProcessorResult } from '../types/index.js';
import axios from 'axios';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

async function downloadAndServe(remoteUrl: string, ext: string): Promise<string> {
  try {
    const response = await axios.get(remoteUrl, { responseType: 'arraybuffer', timeout: 60_000 });
    const filename = `${uuidv4()}.${ext}`;
    writeFileSync(join(UPLOADS_DIR, filename), Buffer.from(response.data));
    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    console.log(`  [Storage] Saved ${ext}: ${filename}`);
    return `${baseUrl}/uploads/${filename}`;
  } catch (err) {
    console.warn(`  [Storage] Could not download ${ext}, using remote URL: ${(err as Error).message}`);
    return remoteUrl;
  }
}

export abstract class BaseProcessor {
  protected vertical: string;
  protected job: ProcessingJob;

  constructor(vertical: string, job: ProcessingJob) {
    this.vertical = vertical;
    this.job = job;
  }

  protected async orchestrate3D(): Promise<OrchestrationResult> {
    const imageUrl = this.job.imagePath;
    const name = this.job.metadata?.name as string | undefined ?? this.vertical;

    const sceneVerticals = ['real_estate', 'museum', 'events'];
    if (sceneVerticals.includes(this.vertical)) {
      const worldLabs = await generateScene(imageUrl, name);

      // Download files locally so browser can load them without CORS issues
      if (worldLabs.splatUrl) {
        worldLabs.splatUrl = await downloadAndServe(worldLabs.splatUrl, 'spz');
      }
      if (worldLabs.colliderGlbUrl) {
        worldLabs.colliderGlbUrl = await downloadAndServe(worldLabs.colliderGlbUrl, 'glb');
      }

      return { worldLabs, rawOutputs: [{ tool: 'generate_3d_scene', result: worldLabs }], analysis: '' };
    } else {
      const fal = await generateMesh(imageUrl);
      return { fal, rawOutputs: [{ tool: 'generate_3d_mesh', result: fal }], analysis: '' };
    }
  }

  abstract process(): Promise<ProcessorResult>;

  protected buildOutput(
    format: string,
    url: string,
    sizeEstimate: number,
    metadata: Record<string, unknown> = {}
  ): ProcessingOutput {
    return { format, path: url, url, size: sizeEstimate, metadata };
  }
}

import { generateScene, generateMesh, type OrchestrationResult } from './DirectOrchestrator.js';
import type { ProcessingJob, ProcessingOutput, ProcessorResult } from '../types/index.js';

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

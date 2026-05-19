import { orchestrate } from './ClaudeOrchestrator.js';
import type { ProcessingJob, ProcessingOutput, ProcessorResult } from '../types/index.js';
import { VERTICAL_CONFIGS } from '../config/verticals.js';

export abstract class BaseProcessor {
  protected vertical: string;
  protected job: ProcessingJob;

  constructor(vertical: string, job: ProcessingJob) {
    this.vertical = vertical;
    this.job = job;
  }

  protected getSystemPrompt(): string {
    const config = VERTICAL_CONFIGS[this.vertical as keyof typeof VERTICAL_CONFIGS];
    return `You are processing a ${config.name} image.
Purpose: ${config.description}
Required features: ${config.features.join(', ')}
Target export formats: ${config.exportFormats.join(', ')}

Main task: ${config.aiPrompt}`;
  }

  protected async orchestrate3D() {
    return orchestrate(
      this.job.vertical,
      this.job.imagePath,
      this.getSystemPrompt()
    );
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

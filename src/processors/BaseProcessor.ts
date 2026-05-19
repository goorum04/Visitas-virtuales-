import Anthropic from '@anthropic-ai/sdk';
import type { ProcessingJob, ProcessingOutput, ProcessorResult } from '../types/index.js';
import { VERTICAL_CONFIGS } from '../config/verticals.js';

export abstract class BaseProcessor {
  protected vertical: string;
  protected job: ProcessingJob;
  protected anthropic: Anthropic;

  constructor(vertical: string, job: ProcessingJob) {
    this.vertical = vertical;
    this.job = job;
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  protected getClaudePrompt(): string {
    const config = VERTICAL_CONFIGS[this.vertical as keyof typeof VERTICAL_CONFIGS];
    return `You are processing an image for: ${config.name}
Purpose: ${config.description}
Required features: ${config.features.join(', ')}
Export formats: ${config.exportFormats.join(', ')}

Main task: ${config.aiPrompt}

Image path: ${this.job.imagePath}

Respond with a JSON object containing:
{
  "analysis": "description of what you see in the image",
  "steps": ["step1", "step2", ...],
  "outputs": [{"format": "glb", "description": "..."}],
  "metadata": {}
}`;
  }

  protected async callClaude(prompt: string): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
    return content.text;
  }

  abstract process(): Promise<ProcessorResult>;

  protected async applyPostProcessing(outputs: ProcessingOutput[]): Promise<ProcessingOutput[]> {
    const config = VERTICAL_CONFIGS[this.vertical as keyof typeof VERTICAL_CONFIGS];
    let result = [...outputs];

    for (const step of config.postProcessing) {
      result = await this.executePostProcessingStep(step, result);
    }

    return result;
  }

  protected async executePostProcessingStep(
    step: string,
    outputs: ProcessingOutput[]
  ): Promise<ProcessingOutput[]> {
    console.log(`  → ${step}`);
    return outputs;
  }

  protected async convertFormat(inputPath: string, targetFormat: string): Promise<ProcessingOutput> {
    return {
      format: targetFormat,
      path: inputPath.replace(/\.[^.]+$/, `.${targetFormat}`),
      size: 50000,
      metadata: { convertedFrom: inputPath },
    };
  }

  protected async exportToFormats(basePath: string): Promise<ProcessingOutput[]> {
    const config = VERTICAL_CONFIGS[this.vertical as keyof typeof VERTICAL_CONFIGS];
    return Promise.all(config.exportFormats.map((fmt) => this.convertFormat(basePath, fmt)));
  }
}

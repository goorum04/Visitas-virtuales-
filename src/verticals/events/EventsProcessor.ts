import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessingOutput, ProcessorResult } from '../../types/index.js';

export class EventsProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🎪 Processing for Events...');

    const claudeAnalysis = await this.callClaude(this.getClaudePrompt());
    console.log('  → Claude analysis done');

    const glbPath = await this.generateBase3D();

    let outputs: ProcessingOutput[] = [
      { format: 'glb', path: glbPath, size: 35_000, metadata: { type: 'event_space' } },
    ];

    outputs = await this.applyPostProcessing(outputs);

    outputs.push(await this.createWebViewer(glbPath));
    outputs.push(await this.generateEmbedCode(glbPath));
    outputs.push(await this.setupAnalyticsDashboard(glbPath));

    return {
      success: true,
      outputs,
      metadata: {
        vertical: 'events',
        claudeAnalysis,
        generatedAt: new Date(),
      },
    };
  }

  private async generateBase3D(): Promise<string> {
    const outputDir = `/output/${this.job.id}`;
    return `${outputDir}/event_space.glb`;
  }

  private async createWebViewer(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Creating web viewer');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_viewer_config.json'),
      size: 5_000,
      metadata: {
        type: 'web_viewer',
        shareUrl: `https://app.imageblaster.io/view/${this.job.id}`,
        embedReady: true,
      },
    };
  }

  private async generateEmbedCode(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Generating embed code');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_embed.json'),
      size: 2_000,
      metadata: {
        type: 'embed_code',
        iframe: `<iframe src="https://app.imageblaster.io/embed/${this.job.id}" />`,
      },
    };
  }

  private async setupAnalyticsDashboard(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Setting up analytics');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_analytics.json'),
      size: 1_500,
      metadata: {
        type: 'analytics',
        trackingId: this.job.id,
        metrics: ['views', 'duration', 'interactions'],
      },
    };
  }
}

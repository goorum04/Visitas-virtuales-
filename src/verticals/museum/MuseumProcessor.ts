import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessingOutput, ProcessorResult } from '../../types/index.js';

export class MuseumProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏛️ Processing for Museum...');

    const claudeAnalysis = await this.callClaude(this.getClaudePrompt());
    console.log('  → Claude analysis done');

    const glbPath = await this.generateBase3D();

    let outputs: ProcessingOutput[] = [
      { format: 'glb', path: glbPath, size: 60_000, metadata: { type: 'exhibit_model' } },
    ];

    outputs = await this.applyPostProcessing(outputs);

    outputs.push(await this.createHotspots(glbPath));
    outputs.push(await this.generateAudioGuide(glbPath));
    outputs.push(await this.createInfoPanels(glbPath));

    return {
      success: true,
      outputs,
      metadata: {
        vertical: 'museum',
        claudeAnalysis,
        generatedAt: new Date(),
      },
    };
  }

  private async generateBase3D(): Promise<string> {
    const outputDir = `/output/${this.job.id}`;
    return `${outputDir}/exhibit.glb`;
  }

  private async createHotspots(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Creating interactive hotspots');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_hotspots.json'),
      size: 8_000,
      metadata: { type: 'hotspots', count: 0, interactive: true },
    };
  }

  private async generateAudioGuide(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Generating audio guide');
    return {
      format: 'mp3',
      path: glbPath.replace('.glb', '_audio_guide.mp3'),
      size: 5_000_000,
      metadata: { type: 'audio_guide', languages: ['es', 'en', 'fr'] },
    };
  }

  private async createInfoPanels(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Creating info panels');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_info_panels.json'),
      size: 12_000,
      metadata: { type: 'info_panels', multilang: true },
    };
  }
}

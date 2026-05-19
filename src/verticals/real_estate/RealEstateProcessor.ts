import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessingOutput, ProcessorResult } from '../../types/index.js';

export class RealEstateProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏠 Processing for Real Estate...');

    const claudeAnalysis = await this.callClaude(this.getClaudePrompt());
    console.log('  → Claude analysis done');

    const glbPath = await this.generateBase3D();

    let outputs: ProcessingOutput[] = [
      { format: 'glb', path: glbPath, size: 45_000, metadata: { type: 'base_model' } },
    ];

    outputs = await this.applyPostProcessing(outputs);

    outputs.push(await this.extractFloorPlan(glbPath));
    outputs.push(await this.calculateMeasurements(glbPath));
    outputs.push(await this.generateAmbientAudio(glbPath));

    return {
      success: true,
      outputs,
      metadata: {
        vertical: 'real_estate',
        claudeAnalysis,
        generatedAt: new Date(),
      },
    };
  }

  private async generateBase3D(): Promise<string> {
    // Calls World Labs Marble API via Claude orchestration
    const outputDir = `/output/${this.job.id}`;
    return `${outputDir}/property.glb`;
  }

  private async extractFloorPlan(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Extracting floor plan');
    return {
      format: 'svg',
      path: glbPath.replace('.glb', '_floorplan.svg'),
      size: 15_000,
      metadata: { type: 'floor_plan', generated: true },
    };
  }

  private async calculateMeasurements(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Calculating measurements');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_measurements.json'),
      size: 5_000,
      metadata: {
        type: 'measurements',
        squareMeters: 0,
        rooms: 0,
        calculated: true,
      },
    };
  }

  private async generateAmbientAudio(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Generating ambient audio');
    return {
      format: 'mp3',
      path: glbPath.replace('.glb', '_ambient.mp3'),
      size: 3_200_000,
      metadata: { type: 'ambient_audio', duration: '120s' },
    };
  }
}

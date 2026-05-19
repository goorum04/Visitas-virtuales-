import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class RealEstateProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏠 Real Estate processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.glbUrl) {
      outputs.push(this.buildOutput('glb', result.glbUrl, 45_000, {
        type: 'scene', sceneId: result.sceneId,
      }));
    }
    if (result.meshUrl) {
      outputs.push(this.buildOutput('glb', result.meshUrl, 30_000, {
        type: 'mesh',
      }));
    }
    if (result.audioUrl) {
      outputs.push(this.buildOutput('mp3', result.audioUrl, 3_200_000, {
        type: 'ambient_audio', duration: '120s',
      }));
    }

    // Floor plan + measurements are computed post-hoc from the GLB
    if (result.glbUrl) {
      const base = result.glbUrl.replace('.glb', '');
      outputs.push(this.buildOutput('svg', `${base}_floorplan.svg`, 15_000, { type: 'floor_plan' }));
      outputs.push(this.buildOutput('json', `${base}_measurements.json`, 5_000, { type: 'measurements' }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'real_estate', analysis: result.analysis, rawOutputs: result.rawOutputs },
    };
  }
}

import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class MuseumProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏛️ Museum processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.glbUrl) {
      outputs.push(this.buildOutput('glb', result.glbUrl, 60_000, { type: 'exhibit_scene' }));
      const base = result.glbUrl.replace('.glb', '');
      outputs.push(this.buildOutput('json', `${base}_hotspots.json`, 8_000, {
        type: 'hotspots', interactive: true,
      }));
      outputs.push(this.buildOutput('json', `${base}_info_panels.json`, 12_000, {
        type: 'info_panels', languages: ['es', 'en', 'fr'],
      }));
    }
    if (result.audioUrl) {
      outputs.push(this.buildOutput('mp3', result.audioUrl, 5_000_000, {
        type: 'audio_guide', multilang: true,
      }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'museum', analysis: result.analysis },
    };
  }
}

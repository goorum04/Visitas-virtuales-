import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class MuseumProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏛️ Museum processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.worldLabs) {
      const wl = result.worldLabs;
      if (wl.colliderGlbUrl)  outputs.push(this.buildOutput('glb', wl.colliderGlbUrl, 0, { type: 'exhibit_scene' }));
      if (wl.splatUrl)        outputs.push(this.buildOutput('spz', wl.splatUrl, 0, { type: 'gaussian_splat' }));
      if (wl.marbleViewerUrl) outputs.push(this.buildOutput('url', wl.marbleViewerUrl, 0, { type: 'viewer_url' }));
      if (wl.thumbnailUrl)    outputs.push(this.buildOutput('jpg', wl.thumbnailUrl, 0, { type: 'thumbnail' }));
    }

    if (result.audioBuffer) {
      outputs.push(this.buildOutput('mp3', `pending_upload_${this.job.id}.mp3`, result.audioBuffer.length, {
        type: 'audio_guide',
        audioBuffer: result.audioBuffer.toString('base64'),
      }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'museum', analysis: result.analysis },
    };
  }
}

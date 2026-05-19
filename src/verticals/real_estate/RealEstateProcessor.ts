import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class RealEstateProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏠 Real Estate processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    // World Labs: navigable 3D scene
    if (result.worldLabs) {
      const wl = result.worldLabs;
      if (wl.colliderGlbUrl) {
        outputs.push(this.buildOutput('glb', wl.colliderGlbUrl, 0, {
          type: 'collider_mesh',
          source: 'world_labs',
        }));
      }
      if (wl.splatUrl) {
        outputs.push(this.buildOutput('spz', wl.splatUrl, 0, {
          type: 'gaussian_splat',
          source: 'world_labs',
        }));
      }
      if (wl.marbleViewerUrl) {
        outputs.push(this.buildOutput('url', wl.marbleViewerUrl, 0, {
          type: 'viewer_url',
          shareable: true,
        }));
      }
      if (wl.thumbnailUrl) {
        outputs.push(this.buildOutput('jpg', wl.thumbnailUrl, 0, {
          type: 'thumbnail',
        }));
      }
    }

    // Ambient audio
    if (result.audioBuffer) {
      outputs.push(this.buildOutput('mp3', `pending_upload_${this.job.id}.mp3`, result.audioBuffer.length, {
        type: 'ambient_audio',
        audioBuffer: result.audioBuffer.toString('base64'),
      }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: {
        vertical: 'real_estate',
        analysis: result.analysis,
        worldLabsCaption: result.worldLabs?.caption,
      },
    };
  }
}

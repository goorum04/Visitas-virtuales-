import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class EventsProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🎪 Events processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.glbUrl) {
      outputs.push(this.buildOutput('glb', result.glbUrl, 35_000, { type: 'event_space' }));
      outputs.push(this.buildOutput('json', `${result.glbUrl.replace('.glb', '')}_viewer.json`, 5_000, {
        type: 'web_viewer',
        shareUrl: `https://app.imageblaster.io/view/${this.job.id}`,
        embedIframe: `<iframe src="https://app.imageblaster.io/embed/${this.job.id}" width="100%" height="600" />`,
        analytics: { trackingId: this.job.id, metrics: ['views', 'duration', 'interactions'] },
      }));
    }
    if (result.audioUrl) {
      outputs.push(this.buildOutput('mp3', result.audioUrl, 2_000_000, { type: 'event_audio' }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'events', analysis: result.analysis },
    };
  }
}

import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class RetailProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🛍️ Retail processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.glbUrl) {
      const base = result.glbUrl.replace('.glb', '');
      outputs.push(this.buildOutput('glb', result.glbUrl, 25_000, { type: 'product_model' }));
      outputs.push(this.buildOutput('webp_360', `${base}_360.webp`, 1_500_000, {
        type: '360_rotation', frames: 36, fps: 30,
      }));
      outputs.push(this.buildOutput('json', `${base}_tags.json`, 4_000, {
        type: 'product_tags', shopifyCompatible: true, woocommerceCompatible: true,
      }));
      outputs.push(this.buildOutput('json', `${base}_seo.json`, 2_000, {
        type: 'seo_metadata', schema: 'Product', jsonLd: true,
      }));
    }
    if (result.meshUrl && result.meshUrl !== result.glbUrl) {
      outputs.push(this.buildOutput('glb', result.meshUrl, 20_000, { type: 'detailed_mesh' }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'retail', analysis: result.analysis, shopifyReady: true },
    };
  }
}

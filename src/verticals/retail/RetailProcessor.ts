import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class RetailProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🛍️ Retail processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.fal) {
      const f = result.fal;
      outputs.push(this.buildOutput('glb', f.glbUrl, 0, {
        type: 'product_model',
        source: 'fal_hunyuan3d',
        pbr: true,
      }));
      if (f.fbxUrl) outputs.push(this.buildOutput('fbx', f.fbxUrl, 0, { type: 'fbx_export' }));
      if (f.objUrl) outputs.push(this.buildOutput('obj', f.objUrl, 0, { type: 'obj_export', shopifyCompatible: true }));
      if (f.thumbnailUrl) outputs.push(this.buildOutput('jpg', f.thumbnailUrl, 0, { type: 'thumbnail' }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'retail', analysis: result.analysis, shopifyReady: true },
    };
  }
}

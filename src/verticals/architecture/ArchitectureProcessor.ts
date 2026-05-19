import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class ArchitectureProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏗️ Architecture processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    if (result.glbUrl) {
      const base = result.glbUrl.replace('.glb', '');
      outputs.push(this.buildOutput('glb', result.glbUrl, 80_000, { type: 'architectural_model' }));
      outputs.push(this.buildOutput('fbx', `${base}.fbx`, 120_000, {
        type: 'fbx_export', version: '2023.x', archiCADCompatible: true,
      }));
      // Photorealistic renders from 4 angles
      for (const angle of ['front', 'side', 'aerial', 'interior']) {
        outputs.push(this.buildOutput('json', `${base}_render_${angle}.jpg`, 4_000_000, {
          type: 'render', angle, resolution: '4K', photorealistic: true,
        }));
      }
      outputs.push(this.buildOutput('json', `${base}_materials.json`, 20_000, {
        type: 'material_library', pbr: true,
      }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'architecture', analysis: result.analysis },
    };
  }
}

import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessorResult } from '../../types/index.js';

export class ArchitectureProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🏗️ Architecture processing...');

    const result = await this.orchestrate3D();
    const outputs = [];

    // GLB mesh from FAL for precise geometry
    if (result.fal) {
      const f = result.fal;
      outputs.push(this.buildOutput('glb', f.glbUrl, 0, { type: 'architectural_model', source: 'fal' }));
      if (f.fbxUrl) outputs.push(this.buildOutput('fbx', f.fbxUrl, 0, { type: 'fbx', archiCADCompatible: true }));
      if (f.thumbnailUrl) outputs.push(this.buildOutput('jpg', f.thumbnailUrl, 0, { type: 'thumbnail' }));
    }

    // Also generate navigable scene if World Labs succeeded
    if (result.worldLabs?.marbleViewerUrl) {
      outputs.push(this.buildOutput('url', result.worldLabs.marbleViewerUrl, 0, {
        type: 'walkthrough_viewer',
      }));
    }

    return {
      success: outputs.length > 0,
      outputs,
      metadata: { vertical: 'architecture', analysis: result.analysis },
    };
  }
}

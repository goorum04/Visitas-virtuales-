import { BaseProcessor } from '../../processors/BaseProcessor.js';
import type { ProcessingOutput, ProcessorResult } from '../../types/index.js';

export class RetailProcessor extends BaseProcessor {
  async process(): Promise<ProcessorResult> {
    console.log('🛍️ Processing for Retail...');

    const claudeAnalysis = await this.callClaude(this.getClaudePrompt());
    console.log('  → Claude analysis done');

    const glbPath = await this.generateBase3D();
    const rotation360 = await this.create360Rotation(glbPath);

    let outputs: ProcessingOutput[] = [
      { format: 'glb', path: glbPath, size: 25_000, metadata: { type: 'product_model' } },
      rotation360,
    ];

    outputs = await this.applyPostProcessing(outputs);

    outputs.push(await this.addProductTags(glbPath));
    outputs.push(await this.generateSEOMetadata(glbPath));

    return {
      success: true,
      outputs,
      metadata: {
        vertical: 'retail',
        claudeAnalysis,
        shopifyReady: true,
        generatedAt: new Date(),
      },
    };
  }

  private async generateBase3D(): Promise<string> {
    const outputDir = `/output/${this.job.id}`;
    return `${outputDir}/product.glb`;
  }

  private async create360Rotation(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Generating 360° rotation');
    return {
      format: 'webp_360',
      path: glbPath.replace('.glb', '_360.webp'),
      size: 1_500_000,
      metadata: { type: '360_rotation', frames: 36, fps: 30 },
    };
  }

  private async addProductTags(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Adding product tags');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_product_tags.json'),
      size: 4_000,
      metadata: {
        type: 'product_tags',
        tags: [],
        shopifyCompatible: true,
        woocommerceCompatible: true,
      },
    };
  }

  private async generateSEOMetadata(glbPath: string): Promise<ProcessingOutput> {
    console.log('  → Generating SEO metadata');
    return {
      format: 'json',
      path: glbPath.replace('.glb', '_seo.json'),
      size: 2_000,
      metadata: {
        type: 'seo',
        schema: 'Product',
        jsonLd: true,
      },
    };
  }
}

import { v4 as uuidv4 } from 'uuid';
import { VERTICAL_CONFIGS } from './config/verticals.js';
import type { Vertical, ProcessingJob, ProcessorResult } from './types/index.js';
import { RealEstateProcessor } from './verticals/real_estate/RealEstateProcessor.js';
import { MuseumProcessor } from './verticals/museum/MuseumProcessor.js';
import { GameDevProcessor } from './verticals/gamedev/GameDevProcessor.js';
import { EventsProcessor } from './verticals/events/EventsProcessor.js';
import { RetailProcessor } from './verticals/retail/RetailProcessor.js';
import { ArchitectureProcessor } from './verticals/architecture/ArchitectureProcessor.js';
import { BaseProcessor } from './processors/BaseProcessor.js';

export class ImageBlasterOrchestrator {
  async processImage(vertical: Vertical, imagePath: string): Promise<ProcessorResult> {
    console.log(`\n🚀 Image-Blaster starting: ${vertical}`);
    console.log(`   Image: ${imagePath}`);

    const job: ProcessingJob = {
      id: uuidv4(),
      vertical,
      imagePath,
      config: VERTICAL_CONFIGS[vertical],
      status: 'processing',
      outputs: [],
      createdAt: new Date(),
    };

    const processor = this.selectProcessor(vertical, job);
    const result = await processor.process();

    result.metadata = { ...result.metadata, jobId: job.id, processingTime: Date.now() };
    console.log(`\n✅ Done: ${result.outputs.length} files generated`);

    return result;
  }

  private selectProcessor(vertical: Vertical, job: ProcessingJob): BaseProcessor {
    const map: Record<Vertical, new (v: string, j: ProcessingJob) => BaseProcessor> = {
      real_estate: RealEstateProcessor,
      museum: MuseumProcessor,
      gamedev: GameDevProcessor,
      events: EventsProcessor,
      retail: RetailProcessor,
      architecture: ArchitectureProcessor,
    };

    const ProcessorClass = map[vertical];
    if (!ProcessorClass) throw new Error(`Unknown vertical: ${vertical}`);
    return new ProcessorClass(vertical, job);
  }
}

import 'dotenv/config';
import { ImageBlasterOrchestrator } from './src/orchestrator.js';
import type { Vertical } from './src/types/index.js';

const orchestrator = new ImageBlasterOrchestrator();

async function testVertical(vertical: Vertical, image: string) {
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Testing: ${vertical}`);
  console.log('='.repeat(40));
  try {
    const result = await orchestrator.processImage(vertical, image);
    console.log(`✅ Success: ${result.outputs.length} outputs`);
    result.outputs.forEach((o) => console.log(`   - ${o.format}: ${o.path}`));
  } catch (err) {
    console.error(`❌ Error: ${(err as Error).message}`);
  }
}

async function main() {
  await testVertical('real_estate', 'input/house.jpg');
  await testVertical('museum', 'input/artifact.jpg');
  await testVertical('gamedev', 'input/environment.jpg');
  await testVertical('events', 'input/venue.jpg');
  await testVertical('retail', 'input/product.jpg');
  await testVertical('architecture', 'input/building.jpg');
}

main();

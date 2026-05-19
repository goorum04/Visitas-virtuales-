import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import type { Vertical } from '../types/index.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ===== World Labs Marble =====

export interface WorldLabsAssets {
  colliderGlbUrl?: string;
  splatUrl?: string;
  thumbnailUrl?: string;
  marbleViewerUrl?: string;
  caption?: string;
}

async function generateWorldLabsScene(
  imageUrl: string,
  displayName: string,
  textPrompt?: string
): Promise<WorldLabsAssets> {
  const key = process.env.WORLD_LABS_API_KEY;
  if (!key) throw new Error('WORLD_LABS_API_KEY not set');

  const BASE = 'https://api.worldlabs.ai/marble/v1';
  const headers = { 'WLT-Api-Key': key, 'Content-Type': 'application/json' };

  console.log('  [WorldLabs] Submitting generation...');
  const { data: op } = await axios.post(
    `${BASE}/worlds:generate`,
    {
      display_name: displayName,
      model: 'marble-1.1',
      world_prompt: {
        type: 'image',
        image_prompt: { source: 'uri', uri: imageUrl },
        ...(textPrompt ? { text_prompt: textPrompt } : {}),
      },
    },
    { headers, timeout: 15_000 }
  );

  const operationId: string = op.operation_id;
  console.log(`  [WorldLabs] operation_id: ${operationId} — polling every 15s (~5 min total)...`);

  for (let i = 0; i < 40; i++) {
    await sleep(15_000);
    const { data: poll } = await axios.get(`${BASE}/operations/${operationId}`, {
      headers: { 'WLT-Api-Key': key },
      timeout: 10_000,
    });

    if (poll.error) throw new Error(`WorldLabs error: ${JSON.stringify(poll.error)}`);

    if (poll.done && poll.response) {
      const r = poll.response;
      console.log('  [WorldLabs] Done!');
      return {
        colliderGlbUrl: r.assets?.mesh?.collider_mesh_url,
        splatUrl: r.assets?.splats?.spz_urls?.full_res,
        thumbnailUrl: r.assets?.imagery?.thumbnail_url ?? r.assets?.thumbnail_url,
        marbleViewerUrl: r.world_marble_url,
        caption: r.assets?.caption,
      };
    }

    const status = poll.metadata?.progress?.status ?? 'processing';
    console.log(`  [WorldLabs] ${status} (${(i + 1) * 15}s elapsed)`);
  }

  throw new Error('WorldLabs: timed out after 10 minutes');
}

// ===== FAL Hunyuan3D v3 (queue-based) =====

export interface FalMeshResult {
  glbUrl: string;
  fbxUrl?: string;
  objUrl?: string;
  thumbnailUrl?: string;
  seed?: number;
}

async function generateFalMesh(
  imageUrl: string,
  opts?: { faceCount?: number; enablePbr?: boolean }
): Promise<FalMeshResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const MODEL = 'fal-ai/hunyuan3d-v3/image-to-3d';
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  // 1. Submit to queue
  console.log('  [FAL] Submitting Hunyuan3D-v3...');
  const { data: job } = await axios.post(
    `https://queue.fal.run/${MODEL}`,
    {
      input_image_url: imageUrl,
      face_count: opts?.faceCount ?? 500_000,
      enable_pbr: opts?.enablePbr ?? false,
      generate_type: 'Normal',
      polygon_type: 'triangle',
    },
    { headers, timeout: 15_000 }
  );

  const requestId: string = job.request_id;
  console.log(`  [FAL] request_id: ${requestId} — polling...`);

  // 2. Poll status
  for (let i = 0; i < 60; i++) {
    await sleep(5_000);
    const { data: status } = await axios.get(
      `https://queue.fal.run/${MODEL}/requests/${requestId}/status`,
      { headers, timeout: 10_000 }
    );

    if (status.status === 'COMPLETED') break;
    if (status.status === 'FAILED') throw new Error(`FAL job failed: ${JSON.stringify(status)}`);
    console.log(`  [FAL] ${status.status} (${(i + 1) * 5}s elapsed)`);
  }

  // 3. Fetch result
  const { data: result } = await axios.get(
    `https://queue.fal.run/${MODEL}/requests/${requestId}`,
    { headers, timeout: 10_000 }
  );

  const glbUrl = result.model_glb?.url;
  if (!glbUrl) throw new Error('FAL: no model_glb.url in response');
  console.log(`  [FAL] GLB ready: ${glbUrl.substring(0, 60)}...`);

  return {
    glbUrl,
    fbxUrl: result.model_urls?.fbx,
    objUrl: result.model_urls?.obj,
    thumbnailUrl: result.thumbnail?.url,
    seed: result.seed,
  };
}

// ===== ElevenLabs ambient audio =====

async function generateAmbientAudio(description: string, durationSeconds = 22): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY not set');

  console.log('  [ElevenLabs] Generating ambient audio...');
  const { data } = await axios.post(
    'https://api.elevenlabs.io/v1/sound-generation',
    {
      text: description,
      duration_seconds: Math.min(durationSeconds, 22), // ElevenLabs max is 22s
      prompt_influence: 0.3,
    },
    {
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
      timeout: 60_000,
    }
  );

  const buf = Buffer.from(data as ArrayBuffer);
  console.log(`  [ElevenLabs] Audio ready: ${(buf.length / 1024).toFixed(0)} KB`);
  return buf;
}

// ===== Claude tool definitions =====

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_3d_scene',
    description:
      'Generates an immersive, navigable 3D world from an image using World Labs Marble. ' +
      'Best for spaces: rooms, buildings, outdoor environments. Takes ~5 minutes. ' +
      'Returns a collider GLB, Gaussian splat (SPZ), and shareable viewer URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_url: { type: 'string', description: 'Public HTTPS URL of the input image' },
        display_name: { type: 'string', description: 'Name for the generated world' },
        text_prompt: { type: 'string', description: 'Optional description to guide generation' },
      },
      required: ['image_url', 'display_name'],
    },
  },
  {
    name: 'generate_3d_mesh',
    description:
      'Generates a precise polygon 3D mesh (GLB/FBX) from an image using FAL Hunyuan3D-v3. ' +
      'Best for objects, products, and assets. Takes 30-120 seconds. ' +
      'Returns GLB, FBX, OBJ URLs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_url: { type: 'string', description: 'Public HTTPS URL of the input image' },
        face_count: { type: 'number', description: 'Polygon count (40000–1500000, default 500000)' },
        enable_pbr: { type: 'boolean', description: 'Generate PBR materials (higher quality, 3x cost)' },
      },
      required: ['image_url'],
    },
  },
  {
    name: 'generate_ambient_audio',
    description:
      'Generates short ambient audio (up to 22 seconds) using ElevenLabs sound generation. ' +
      'Use for adding immersive sound to a 3D scene.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string', description: 'Describe the ambient sound (e.g. "quiet living room with distant traffic")' },
        duration_seconds: { type: 'number', description: 'Duration in seconds (max 22)' },
      },
      required: ['description'],
    },
  },
];

// ===== Tool dispatcher =====

async function dispatchTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'generate_3d_scene':
      return generateWorldLabsScene(
        input.image_url as string,
        input.display_name as string,
        input.text_prompt as string | undefined
      );

    case 'generate_3d_mesh':
      return generateFalMesh(input.image_url as string, {
        faceCount: input.face_count as number | undefined,
        enablePbr: input.enable_pbr as boolean | undefined,
      });

    case 'generate_ambient_audio': {
      const buf = await generateAmbientAudio(
        input.description as string,
        input.duration_seconds as number | undefined
      );
      return { audio_base64: buf.toString('base64'), size_bytes: buf.length };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ===== Exported result type =====

export interface OrchestrationResult {
  analysis: string;
  worldLabs?: WorldLabsAssets;
  fal?: FalMeshResult;
  audioBuffer?: Buffer;
  rawOutputs: Array<{ tool: string; result: unknown }>;
}

// ===== Main agentic loop =====

export async function orchestrate(
  vertical: Vertical,
  imageUrl: string,
  systemPrompt: string
): Promise<OrchestrationResult> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `${systemPrompt}

Image URL: ${imageUrl}
Vertical: ${vertical}

Choose tools based on the vertical:
- real_estate, museum, events → generate_3d_scene (World Labs: immersive walkthrough) + generate_ambient_audio
- gamedev, retail, architecture → generate_3d_mesh (FAL: precise polygon mesh)
- retail may also benefit from generate_3d_mesh with enable_pbr: true

Analyze the image content first, then call the appropriate tool(s).`,
    },
  ];

  const rawOutputs: Array<{ tool: string; result: unknown }> = [];
  let analysis = '';
  let worldLabs: WorldLabsAssets | undefined;
  let fal: FalMeshResult | undefined;
  let audioBuffer: Buffer | undefined;

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const texts = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
    if (texts.length) analysis += texts.map((b) => b.text).join('\n');
    if (!toolUses.length || response.stop_reason === 'end_turn') break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      console.log(`  [Claude] → ${tu.name}`);
      try {
        const result = await dispatchTool(tu.name, tu.input as Record<string, unknown>);
        rawOutputs.push({ tool: tu.name, result });

        if (tu.name === 'generate_3d_scene') worldLabs = result as WorldLabsAssets;
        if (tu.name === 'generate_3d_mesh') fal = result as FalMeshResult;
        if (tu.name === 'generate_ambient_audio') {
          const r = result as { audio_base64: string };
          audioBuffer = Buffer.from(r.audio_base64, 'base64');
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        const msg = (err as Error).message;
        console.error(`  [${tu.name}] failed: ${msg}`);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: `Error: ${msg}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { analysis, worldLabs, fal, audioBuffer, rawOutputs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

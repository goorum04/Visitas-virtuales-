import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import type { Vertical } from '../types/index.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ===== Tool definitions =====

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'generate_3d_scene',
    description: 'Generates an interactive 3D scene from an image using World Labs Marble API. Returns a GLB file URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_url: { type: 'string', description: 'URL of the input image' },
        quality: { type: 'string', enum: ['draft', 'standard', 'high'], description: 'Generation quality' },
        style_hints: { type: 'string', description: 'Additional style instructions' },
      },
      required: ['image_url'],
    },
  },
  {
    name: 'generate_3d_mesh',
    description: 'Generates detailed 3D meshes from an image using FAL Hunyuan3D. Returns mesh file URLs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        image_url: { type: 'string', description: 'URL of the input image' },
        output_format: { type: 'string', enum: ['glb', 'obj', 'fbx'], description: 'Output mesh format' },
        detail_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Level of mesh detail' },
      },
      required: ['image_url'],
    },
  },
  {
    name: 'generate_audio',
    description: 'Generates ambient audio for a 3D scene using ElevenLabs. Returns an MP3 URL.',
    input_schema: {
      type: 'object' as const,
      properties: {
        scene_description: { type: 'string', description: 'Description of the space for audio generation' },
        duration_seconds: { type: 'number', description: 'Length of audio in seconds' },
        mood: { type: 'string', enum: ['calm', 'vibrant', 'professional', 'atmospheric'] },
      },
      required: ['scene_description'],
    },
  },
];

// ===== Tool executors =====

async function executeGenerateScene(input: {
  image_url: string;
  quality?: string;
  style_hints?: string;
}): Promise<{ glb_url: string; scene_id: string }> {
  if (!process.env.WORLD_LABS_API_KEY) {
    // Dev mode: return mock URL
    return { glb_url: `https://cdn.worldlabs.ai/mock/${Date.now()}.glb`, scene_id: `wl_${Date.now()}` };
  }
  const res = await axios.post(
    'https://api.worldlabs.ai/v1/scenes/generate',
    { image_url: input.image_url, quality: input.quality || 'standard', style: input.style_hints },
    { headers: { Authorization: `Bearer ${process.env.WORLD_LABS_API_KEY}` }, timeout: 120_000 }
  );
  return { glb_url: res.data.glb_url, scene_id: res.data.id };
}

async function executeGenerateMesh(input: {
  image_url: string;
  output_format?: string;
  detail_level?: string;
}): Promise<{ mesh_url: string; format: string }> {
  if (!process.env.FAL_API_KEY) {
    return { mesh_url: `https://fal.ai/mock/${Date.now()}.glb`, format: input.output_format || 'glb' };
  }
  const res = await axios.post(
    'https://fal.run/fal-ai/hunyuan3d-v2',
    { image_url: input.image_url, output_format: input.output_format || 'glb', detail: input.detail_level || 'high' },
    { headers: { Authorization: `Key ${process.env.FAL_API_KEY}` }, timeout: 180_000 }
  );
  return { mesh_url: res.data.output?.mesh_url || res.data.url, format: input.output_format || 'glb' };
}

async function executeGenerateAudio(input: {
  scene_description: string;
  duration_seconds?: number;
  mood?: string;
}): Promise<{ audio_url: string; duration: number }> {
  // ElevenLabs sound effects / ambient generation
  if (!process.env.ELEVENLABS_API_KEY) {
    return { audio_url: `https://mock.cdn/ambient_${Date.now()}.mp3`, duration: input.duration_seconds || 120 };
  }
  const res = await axios.post(
    'https://api.elevenlabs.io/v1/sound-generation',
    {
      text: `${input.mood || 'calm'} ambient sound for: ${input.scene_description}`,
      duration_seconds: input.duration_seconds || 120,
      prompt_influence: 0.3,
    },
    {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      responseType: 'arraybuffer',
      timeout: 60_000,
    }
  );
  // In production, upload this buffer to S3 and return the URL
  return { audio_url: `https://storage/ambient_${Date.now()}.mp3`, duration: input.duration_seconds || 120 };
}

async function dispatchTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'generate_3d_scene':
      return executeGenerateScene(input as Parameters<typeof executeGenerateScene>[0]);
    case 'generate_3d_mesh':
      return executeGenerateMesh(input as Parameters<typeof executeGenerateMesh>[0]);
    case 'generate_audio':
      return executeGenerateAudio(input as Parameters<typeof executeGenerateAudio>[0]);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ===== Main orchestrator =====

export interface OrchestrationResult {
  analysis: string;
  glbUrl?: string;
  meshUrl?: string;
  audioUrl?: string;
  sceneId?: string;
  rawOutputs: Record<string, unknown>[];
}

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

Please analyze the image and generate the appropriate 3D content using the available tools.
Always call generate_3d_scene first, then generate_3d_mesh for high quality output.
For real_estate, museum, and events verticals also generate ambient audio.`,
    },
  ];

  const rawOutputs: Record<string, unknown>[] = [];
  let analysis = '';
  let glbUrl: string | undefined;
  let meshUrl: string | undefined;
  let audioUrl: string | undefined;
  let sceneId: string | undefined;

  // Agentic loop: let Claude drive until it stops using tools
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');

    if (textBlocks.length > 0) {
      analysis += textBlocks.map((b) => b.text).join('\n');
    }

    if (toolUses.length === 0 || response.stop_reason === 'end_turn') break;

    // Execute all tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      console.log(`  [Claude] calling ${toolUse.name}`);
      try {
        const result = await dispatchTool(toolUse.name, toolUse.input as Record<string, unknown>);
        rawOutputs.push({ tool: toolUse.name, result });

        // Extract key URLs
        const r = result as Record<string, unknown>;
        if (r.glb_url) glbUrl = r.glb_url as string;
        if (r.scene_id) sceneId = r.scene_id as string;
        if (r.mesh_url) meshUrl = r.mesh_url as string;
        if (r.audio_url) audioUrl = r.audio_url as string;

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Error: ${(err as Error).message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return { analysis, glbUrl, meshUrl, audioUrl, sceneId, rawOutputs };
}

import axios from 'axios';

// ===== World Labs Marble =====

export interface WorldLabsAssets {
  colliderGlbUrl?: string;
  splatUrl?: string;
  thumbnailUrl?: string;
  marbleViewerUrl?: string;
  caption?: string;
}

export async function generateScene(
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

// ===== FAL Hunyuan3D v3 =====

export interface FalMeshResult {
  glbUrl: string;
  fbxUrl?: string;
  objUrl?: string;
  thumbnailUrl?: string;
  seed?: number;
}

export async function generateMesh(
  imageUrl: string,
  opts?: { faceCount?: number; enablePbr?: boolean }
): Promise<FalMeshResult> {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error('FAL_API_KEY not set');

  const MODEL = 'fal-ai/hunyuan3d-v3/image-to-3d';
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

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

  const { data: result } = await axios.get(
    `https://queue.fal.run/${MODEL}/requests/${requestId}`,
    { headers, timeout: 10_000 }
  );

  const glbUrl = result.model_glb?.url;
  if (!glbUrl) throw new Error('FAL: no model_glb.url in response');

  return {
    glbUrl,
    fbxUrl: result.model_urls?.fbx,
    objUrl: result.model_urls?.obj,
    thumbnailUrl: result.thumbnail?.url,
    seed: result.seed,
  };
}

// ===== Exported result type =====

export interface OrchestrationResult {
  analysis: string;
  worldLabs?: WorldLabsAssets;
  fal?: FalMeshResult;
  audioBuffer?: Buffer;
  rawOutputs: Array<{ tool: string; result: unknown }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
